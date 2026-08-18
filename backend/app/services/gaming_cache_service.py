"""Bounded two-level cache for Steam metadata and media."""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit

from app.config import settings
from app.services.http_client import http_client
from app.utils.cache import AsyncSingleFlight, TTLCache


CACHE_BASE = settings.data_dir / "gaming_cache"
DETAILS_CACHE_DAYS = 30
ACHIEVEMENTS_CACHE_DAYS = 2
RAW_ACHIEVEMENTS_CACHE_DAYS = 2
NEWS_CACHE_DAYS = 1
SECONDS_PER_DAY = 86_400


class _AssetTooLarge(Exception):
    pass


class GamingCacheService:
    """Cache game JSON in memory + disk and media on bounded local storage."""

    def __init__(self):
        self.details_dir = CACHE_BASE / "details"
        self.achievements_dir = CACHE_BASE / "achievements"
        self.raw_achievements_dir = CACHE_BASE / "achievements_raw"
        self.screenshots_dir = CACHE_BASE / "screenshots"
        self.videos_dir = CACHE_BASE / "videos"
        self.icons_dir = CACHE_BASE / "icons"
        self.news_dir = CACHE_BASE / "news"
        self.news_json_dir = CACHE_BASE / "news_json"
        self._media_dirs = (
            self.screenshots_dir,
            self.videos_dir,
            self.icons_dir,
            self.news_dir,
        )
        self._json_cache: TTLCache[str, Any] = TTLCache(
            max_size=settings.gaming_cache_memory_entries,
            default_ttl=SECONDS_PER_DAY,
        )
        self._download_singleflight: AsyncSingleFlight[str, bool] = AsyncSingleFlight()
        self._download_semaphore = asyncio.Semaphore(settings.gaming_cache_download_concurrency)
        self._prune_task: Optional[asyncio.Task] = None
        self._last_prune_check = 0.0
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        for directory in (
            self.details_dir,
            self.achievements_dir,
            self.raw_achievements_dir,
            *self._media_dirs,
            self.news_json_dir,
        ):
            directory.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _ttl_seconds(expiry_days: int) -> float:
        return expiry_days * SECONDS_PER_DAY

    def _remaining_ttl(self, file_path: Path, expiry_days: int) -> float:
        age = max(0.0, time.time() - file_path.stat().st_mtime)
        return self._ttl_seconds(expiry_days) - age

    def _is_cache_valid(self, file_path: Path, expiry_days: int) -> bool:
        try:
            return self._remaining_ttl(file_path, expiry_days) > 0
        except OSError:
            return False

    def _read_json(self, file_path: Path, expiry_days: int) -> Any:
        key = str(file_path)
        cached = self._json_cache.get(key)
        if cached is not None:
            return cached

        try:
            remaining_ttl = self._remaining_ttl(file_path, expiry_days)
            if remaining_ttl <= 0:
                return None
            with open(file_path, "r", encoding="utf-8") as file:
                payload = json.load(file)
        except (OSError, json.JSONDecodeError, TypeError):
            return None

        self._json_cache.set(key, payload, ttl=remaining_ttl)
        return payload

    def _write_json(self, file_path: Path, payload: Any, expiry_days: int) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path: Optional[Path] = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=file_path.parent,
                prefix=f".{file_path.name}.",
                suffix=".tmp",
                delete=False,
            ) as file:
                temp_path = Path(file.name)
                json.dump(payload, file, ensure_ascii=False, separators=(",", ":"))
            temp_path.replace(file_path)
        except Exception:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink()
            raise

        self._json_cache.set(
            str(file_path),
            payload,
            ttl=self._ttl_seconds(expiry_days),
        )

    def _delete_json(self, file_path: Path) -> None:
        self._json_cache.delete(str(file_path))
        try:
            file_path.unlink()
        except FileNotFoundError:
            pass

    def is_details_cache_valid(self, appid: int) -> bool:
        return self._is_cache_valid(self.details_dir / f"{appid}.json", DETAILS_CACHE_DAYS)

    def is_achievements_cache_valid(self, appid: int) -> bool:
        return self._is_cache_valid(
            self.achievements_dir / f"{appid}.json", ACHIEVEMENTS_CACHE_DAYS
        )

    def is_raw_achievements_cache_valid(self, appid: int) -> bool:
        return self._is_cache_valid(
            self.raw_achievements_dir / f"{appid}.json", RAW_ACHIEVEMENTS_CACHE_DAYS
        )

    def is_news_cache_valid(self, appid: int) -> bool:
        return self._is_cache_valid(self.news_json_dir / f"{appid}.json", NEWS_CACHE_DAYS)

    # JSON cache methods

    def get_cached_details(self, appid: int) -> Optional[Dict]:
        payload = self._read_json(self.details_dir / f"{appid}.json", DETAILS_CACHE_DAYS)
        return payload if isinstance(payload, dict) else None

    def save_details(self, appid: int, details: Dict) -> None:
        self._write_json(self.details_dir / f"{appid}.json", details, DETAILS_CACHE_DAYS)

    def get_cached_achievements(self, appid: int) -> Optional[List[Dict]]:
        payload = self._read_json(
            self.achievements_dir / f"{appid}.json", ACHIEVEMENTS_CACHE_DAYS
        )
        return payload if isinstance(payload, list) else None

    def save_achievements(self, appid: int, achievements: List[Dict]) -> None:
        self._write_json(
            self.achievements_dir / f"{appid}.json",
            achievements,
            ACHIEVEMENTS_CACHE_DAYS,
        )

    def get_cached_raw_achievements(self, appid: int) -> Optional[List[Dict]]:
        payload = self._read_json(
            self.raw_achievements_dir / f"{appid}.json", RAW_ACHIEVEMENTS_CACHE_DAYS
        )
        return payload if isinstance(payload, list) else None

    def save_raw_achievements(self, appid: int, achievements: List[Dict]) -> None:
        self._write_json(
            self.raw_achievements_dir / f"{appid}.json",
            achievements,
            RAW_ACHIEVEMENTS_CACHE_DAYS,
        )

    def get_cached_news(self, appid: int, count: int) -> Optional[List[Dict]]:
        payload = self._read_json(self.news_json_dir / f"{appid}.json", NEWS_CACHE_DAYS)
        if not isinstance(payload, dict):
            return None
        items = payload.get("items", [])
        if not isinstance(items, list):
            return None
        return items[:count] if count else items

    def save_news(self, appid: int, news: List[Dict]) -> None:
        self._write_json(
            self.news_json_dir / f"{appid}.json",
            {"items": news, "count": len(news)},
            NEWS_CACHE_DAYS,
        )

    # Media download methods

    @staticmethod
    def _extension(url: str, default: str, allowed: set[str]) -> str:
        suffix = Path(urlsplit(url).path).suffix.lower().lstrip(".")
        return suffix if suffix in allowed else default

    async def _download_file(
        self,
        url: str,
        dest: Path,
        *,
        headers: Optional[Dict[str, str]] = None,
        timeout: float = 60.0,
    ) -> bool:
        if dest.is_file() and dest.stat().st_size > 0:
            return True

        async def download() -> bool:
            if dest.is_file() and dest.stat().st_size > 0:
                return True

            max_bytes = settings.gaming_cache_max_asset_mb * 1024 * 1024
            temp_path: Optional[Path] = None
            try:
                async with self._download_semaphore:
                    client = await http_client.get()
                    async with client.stream(
                        "GET", url, headers=headers, timeout=timeout
                    ) as response:
                        if response.status_code != 200:
                            return False

                        content_length = response.headers.get("content-length")
                        if content_length and int(content_length) > max_bytes:
                            return False

                        dest.parent.mkdir(parents=True, exist_ok=True)
                        with tempfile.NamedTemporaryFile(
                            mode="wb",
                            dir=dest.parent,
                            prefix=f".{dest.name}.",
                            suffix=".tmp",
                            delete=False,
                        ) as file:
                            temp_path = Path(file.name)
                            downloaded = 0
                            async for chunk in response.aiter_bytes():
                                downloaded += len(chunk)
                                if downloaded > max_bytes:
                                    raise _AssetTooLarge
                                file.write(chunk)

                        if downloaded == 0:
                            temp_path.unlink(missing_ok=True)
                            return False
                        temp_path.replace(dest)
                        self._schedule_prune()
                        return True
            except (_AssetTooLarge, OSError, ValueError):
                if temp_path is not None:
                    temp_path.unlink(missing_ok=True)
                return False
            except Exception:
                if temp_path is not None:
                    temp_path.unlink(missing_ok=True)
                return False

        return await self._download_singleflight.run(str(dest), download)

    async def cache_screenshot(self, appid: int, screenshot: Dict) -> Optional[str]:
        url = screenshot.get("path_full", "")
        if not url:
            return None
        screenshot_id = screenshot.get("id", 0)
        extension = self._extension(url, "jpg", {"jpg", "jpeg", "png", "webp"})
        dest = self.screenshots_dir / str(appid) / f"{screenshot_id}.{extension}"
        if await self._download_file(url, dest):
            return f"/cache/screenshots/{appid}/{screenshot_id}.{extension}"
        return None

    async def cache_video(self, appid: int, movie: Dict) -> Optional[str]:
        thumbnail_url = movie.get("thumbnail", "")
        if not thumbnail_url:
            return None
        movie_id = movie.get("id", 0)
        dest = self.videos_dir / str(appid) / f"{movie_id}_thumb.jpg"
        if await self._download_file(thumbnail_url, dest):
            return f"/cache/videos/{appid}/{movie_id}_thumb.jpg"
        return None

    async def cache_achievement_icon(self, appid: int, achievement: Dict) -> Dict[str, str]:
        result = {"icon": "", "icon_gray": ""}
        api_name = achievement.get("apiname", "unknown")
        safe_name = hashlib.md5(api_name.encode()).hexdigest()[:12]

        async def cache_one(key: str, url: str) -> tuple[str, str]:
            if not url:
                return key, ""
            extension = self._extension(url, "jpg", {"jpg", "jpeg", "png", "webp"})
            dest = self.icons_dir / str(appid) / f"{safe_name}_{key}.{extension}"
            if await self._download_file(url, dest):
                return key, f"/cache/icons/{appid}/{safe_name}_{key}.{extension}"
            return key, ""

        pairs = await asyncio.gather(
            cache_one("icon", achievement.get("icon", "")),
            cache_one("icon_gray", achievement.get("icon_gray", "")),
        )
        result.update(dict(pairs))
        return result

    # Composite cache methods

    async def cache_game_media(self, appid: int, details: Dict) -> Dict:
        cached_details = details.copy()
        screenshots = details.get("screenshots", [])[:10]
        movies = details.get("movies", [])[:4]

        screenshot_results, movie_results = await asyncio.gather(
            asyncio.gather(
                *(self.cache_screenshot(appid, item) for item in screenshots),
                return_exceptions=True,
            ),
            asyncio.gather(
                *(self.cache_video(appid, item) for item in movies),
                return_exceptions=True,
            ),
        )

        if screenshots:
            cached_details["screenshots"] = [
                {**item, **({"local_path": path} if isinstance(path, str) and path else {})}
                for item, path in zip(screenshots, screenshot_results)
            ]
        if movies:
            cached_details["movies"] = [
                {**item, **({"local_thumbnail": path} if isinstance(path, str) and path else {})}
                for item, path in zip(movies, movie_results)
            ]
        return cached_details

    async def cache_achievements_with_icons(
        self, appid: int, achievements: List[Dict]
    ) -> List[Dict]:
        if not achievements:
            return []

        results = await asyncio.gather(
            *(self.cache_achievement_icon(appid, item) for item in achievements),
            return_exceptions=True,
        )
        cached_achievements = []
        for achievement, icons in zip(achievements, results):
            cached = achievement.copy()
            if isinstance(icons, dict):
                if icons.get("icon"):
                    cached["local_icon"] = icons["icon"]
                if icons.get("icon_gray"):
                    cached["local_icon_gray"] = icons["icon_gray"]
            cached_achievements.append(cached)
        return cached_achievements

    async def cache_news_image(self, appid: int, image_url: str) -> Optional[str]:
        if not image_url:
            return None

        url_hash = hashlib.md5(image_url.encode()).hexdigest()[:12]
        extension = self._extension(image_url, "jpg", {"jpg", "jpeg", "png", "webp", "gif"})
        local_file = self.news_dir / str(appid) / f"{url_hash}.{extension}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://store.steampowered.com/",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        }
        if await self._download_file(image_url, local_file, headers=headers, timeout=15.0):
            return f"/cache/news/{appid}/{url_hash}.{extension}"
        return None

    def _extract_image_url(self, contents: str) -> Optional[str]:
        """Extract the best static image or video thumbnail from news content."""
        if not contents:
            return None

        candidates: List[str] = []
        for match in re.finditer(
            r"\[img\]\{STEAM_CLAN_IMAGE\}/([^/]+)/([^\[]+)\[/img\]", contents
        ):
            candidates.append(
                f"https://clan.akamai.steamstatic.com/images/{match.group(1)}/{match.group(2)}"
            )
        for match in re.finditer(
            r"\[img\s+src=[\"\']?\{STEAM_CLAN_IMAGE\}/([^/]+)/([^\"\'\]\s]+)",
            contents,
        ):
            candidates.append(
                f"https://clan.akamai.steamstatic.com/images/{match.group(1)}/{match.group(2)}"
            )
        candidates.extend(
            match.group(1)
            for match in re.finditer(r"<img[^>]+src=[\"\'](https?://[^\"\']+)[\"\']", contents)
        )
        candidates.extend(
            match.group(1)
            for match in re.finditer(r"\[img\](https?://[^\[]+)\[/img\]", contents)
        )

        for pattern in (
            r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
            r"youtu\.be/([a-zA-Z0-9_-]{11})",
            r"youtube\.com/embed/([a-zA-Z0-9_-]{11})",
        ):
            candidates.extend(
                f"https://img.youtube.com/vi/{match.group(1)}/maxresdefault.jpg"
                for match in re.finditer(pattern, contents)
            )

        if not candidates:
            return None

        def priority(url: str) -> int:
            lower = url.lower()
            if ".gif" in lower:
                return 3
            if "img.youtube.com" in lower:
                return 2
            if any(extension in lower for extension in (".jpg", ".jpeg", ".png", ".webp")):
                return 1
            return 2

        return min(candidates, key=priority)

    async def cache_news_with_images(self, appid: int, news: List[Dict]) -> List[Dict]:
        if not news:
            return []

        image_urls = [
            self._extract_image_url(item.get("contents", "")) for item in news[:8]
        ]
        results = await asyncio.gather(
            *(
                self.cache_news_image(appid, url)
                if url
                else asyncio.sleep(0, result=None)
                for url in image_urls
            ),
            return_exceptions=True,
        )

        cached_news = []
        for index, item in enumerate(news):
            cached = item.copy()
            if index < len(image_urls):
                image_url = image_urls[index]
                local_path = results[index]
                if isinstance(local_path, str) and local_path:
                    cached["local_image"] = local_path
                if image_url:
                    cached["image_url"] = image_url
            cached_news.append(cached)
        return cached_news

    # Capacity, observability and invalidation

    def _schedule_prune(self) -> None:
        now = time.monotonic()
        if now - self._last_prune_check < settings.gaming_cache_prune_interval_seconds:
            return
        if self._prune_task is not None and not self._prune_task.done():
            return
        self._last_prune_check = now
        self._prune_task = asyncio.create_task(asyncio.to_thread(self.prune_media_cache))

    def prune_media_cache(self) -> Dict[str, int]:
        max_bytes = settings.gaming_cache_max_size_mb * 1024 * 1024
        target_bytes = int(max_bytes * 0.9)
        files: List[tuple[Path, int, float]] = []
        total_bytes = 0
        for directory in self._media_dirs:
            for path in directory.rglob("*"):
                if not path.is_file():
                    continue
                try:
                    stat = path.stat()
                except OSError:
                    continue
                total_bytes += stat.st_size
                files.append((path, stat.st_size, stat.st_mtime))

        deleted_files = 0
        deleted_bytes = 0
        if total_bytes > max_bytes:
            for path, size, _ in sorted(files, key=lambda item: item[2]):
                try:
                    path.unlink()
                    deleted_files += 1
                    deleted_bytes += size
                except OSError:
                    continue
                if total_bytes - deleted_bytes <= target_bytes:
                    break

        return {
            "total_bytes": total_bytes - deleted_bytes,
            "max_bytes": max_bytes,
            "deleted_files": deleted_files,
            "deleted_bytes": deleted_bytes,
        }

    def get_cache_status(self, appid: int) -> Dict:
        details_file = self.details_dir / f"{appid}.json"
        achievements_file = self.achievements_dir / f"{appid}.json"
        raw_file = self.raw_achievements_dir / f"{appid}.json"
        news_file = self.news_json_dir / f"{appid}.json"
        screenshots_dir = self.screenshots_dir / str(appid)
        icons_dir = self.icons_dir / str(appid)

        return {
            "appid": appid,
            "details_cached": details_file.exists(),
            "details_valid": self._is_cache_valid(details_file, DETAILS_CACHE_DAYS),
            "achievements_cached": achievements_file.exists(),
            "achievements_valid": self._is_cache_valid(
                achievements_file, ACHIEVEMENTS_CACHE_DAYS
            ),
            "raw_achievements_cached": raw_file.exists(),
            "raw_achievements_valid": self._is_cache_valid(
                raw_file, RAW_ACHIEVEMENTS_CACHE_DAYS
            ),
            "news_cached": news_file.exists(),
            "news_valid": self._is_cache_valid(news_file, NEWS_CACHE_DAYS),
            "screenshots_count": (
                sum(1 for path in screenshots_dir.iterdir() if path.is_file())
                if screenshots_dir.exists()
                else 0
            ),
            "icons_count": (
                sum(1 for path in icons_dir.iterdir() if path.is_file())
                if icons_dir.exists()
                else 0
            ),
        }

    def cache_info(self) -> Dict:
        return {
            "json_memory": self._json_cache.info(),
            "downloads": self._download_singleflight.info(),
            "download_concurrency": settings.gaming_cache_download_concurrency,
            "max_asset_bytes": settings.gaming_cache_max_asset_mb * 1024 * 1024,
            "max_media_bytes": settings.gaming_cache_max_size_mb * 1024 * 1024,
        }

    def clear_cache(self, appid: Optional[int] = None) -> None:
        if appid is not None:
            for directory in (
                self.details_dir,
                self.achievements_dir,
                self.raw_achievements_dir,
                self.news_json_dir,
            ):
                self._delete_json(directory / f"{appid}.json")
            for directory in self._media_dirs:
                path = directory / str(appid)
                if path.exists():
                    shutil.rmtree(path)
            return

        self._json_cache.clear()
        for directory in (
            self.details_dir,
            self.achievements_dir,
            self.raw_achievements_dir,
            *self._media_dirs,
            self.news_json_dir,
        ):
            if directory.exists():
                shutil.rmtree(directory)
            directory.mkdir(parents=True, exist_ok=True)

    async def close(self) -> None:
        if self._prune_task is not None and not self._prune_task.done():
            await self._prune_task


gaming_cache_service = GamingCacheService()
