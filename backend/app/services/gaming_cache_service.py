"""Gaming cache service for local storage of game data and media"""
import os
import json
import hashlib
import asyncio
from pathlib import Path
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import httpx

CACHE_BASE = Path(__file__).parent.parent.parent / "data" / "gaming_cache"
DETAILS_CACHE_DAYS = 30
ACHIEVEMENTS_CACHE_DAYS = 2
RAW_ACHIEVEMENTS_CACHE_DAYS = 2
NEWS_CACHE_DAYS = 1


class GamingCacheService:
    """Service for caching game details, achievements, and media files"""

    def __init__(self):
        self.details_dir = CACHE_BASE / "details"
        self.achievements_dir = CACHE_BASE / "achievements"
        self.raw_achievements_dir = CACHE_BASE / "achievements_raw"
        self.screenshots_dir = CACHE_BASE / "screenshots"
        self.videos_dir = CACHE_BASE / "videos"
        self.icons_dir = CACHE_BASE / "icons"
        self.news_dir = CACHE_BASE / "news"
        self.news_json_dir = CACHE_BASE / "news_json"
        self._ensure_dirs()

    def _ensure_dirs(self):
        """Ensure all cache directories exist"""
        for d in [
            self.details_dir,
            self.achievements_dir,
            self.raw_achievements_dir,
            self.screenshots_dir,
            self.videos_dir,
            self.icons_dir,
            self.news_dir,
            self.news_json_dir,
        ]:
            d.mkdir(parents=True, exist_ok=True)

    def _is_cache_valid(self, file_path: Path, expiry_days: int) -> bool:
        """Check if cache file exists and is not expired"""
        if not file_path.exists():
            return False
        mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
        return datetime.now() - mtime < timedelta(days=expiry_days)

    def is_details_cache_valid(self, appid: int) -> bool:
        cache_file = self.details_dir / f"{appid}.json"
        return self._is_cache_valid(cache_file, DETAILS_CACHE_DAYS)

    def is_achievements_cache_valid(self, appid: int) -> bool:
        cache_file = self.achievements_dir / f"{appid}.json"
        return self._is_cache_valid(cache_file, ACHIEVEMENTS_CACHE_DAYS)

    def is_raw_achievements_cache_valid(self, appid: int) -> bool:
        cache_file = self.raw_achievements_dir / f"{appid}.json"
        return self._is_cache_valid(cache_file, RAW_ACHIEVEMENTS_CACHE_DAYS)

    def is_news_cache_valid(self, appid: int) -> bool:
        cache_file = self.news_json_dir / f"{appid}.json"
        return self._is_cache_valid(cache_file, NEWS_CACHE_DAYS)

    # === JSON Cache Methods ===

    def get_cached_details(self, appid: int) -> Optional[Dict]:
        """Get cached game details"""
        cache_file = self.details_dir / f"{appid}.json"
        if self._is_cache_valid(cache_file, DETAILS_CACHE_DAYS):
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def save_details(self, appid: int, details: Dict):
        """Save game details to cache"""
        cache_file = self.details_dir / f"{appid}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(details, f, ensure_ascii=False, indent=2)

    def get_cached_achievements(self, appid: int) -> Optional[List[Dict]]:
        """Get cached achievements"""
        cache_file = self.achievements_dir / f"{appid}.json"
        if self._is_cache_valid(cache_file, ACHIEVEMENTS_CACHE_DAYS):
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def save_achievements(self, appid: int, achievements: List[Dict]):
        """Save achievements to cache"""
        cache_file = self.achievements_dir / f"{appid}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(achievements, f, ensure_ascii=False, indent=2)

    def get_cached_raw_achievements(self, appid: int) -> Optional[List[Dict]]:
        """Get cached raw achievements"""
        cache_file = self.raw_achievements_dir / f"{appid}.json"
        if self._is_cache_valid(cache_file, RAW_ACHIEVEMENTS_CACHE_DAYS):
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def save_raw_achievements(self, appid: int, achievements: List[Dict]):
        """Save raw achievements to cache"""
        cache_file = self.raw_achievements_dir / f"{appid}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(achievements, f, ensure_ascii=False, indent=2)

    def get_cached_news(self, appid: int, count: int) -> Optional[List[Dict]]:
        """Get cached news items. Returns cached data if valid, regardless of count."""
        cache_file = self.news_json_dir / f"{appid}.json"
        if self._is_cache_valid(cache_file, NEWS_CACHE_DAYS):
            with open(cache_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
            items = payload.get("items", [])
            if not isinstance(items, list):
                return None
            # Return available items up to requested count (don't force refetch if fewer)
            if count:
                return items[:count]
            return items
        return None

    def save_news(self, appid: int, news: List[Dict]):
        """Save news items to cache"""
        cache_file = self.news_json_dir / f"{appid}.json"
        payload = {"items": news, "count": len(news)}
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    # === Media Download Methods ===

    async def _download_file(self, url: str, dest: Path) -> bool:
        """Download a file from URL to destination"""
        if dest.exists():
            return True
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    with open(dest, "wb") as f:
                        f.write(response.content)
                    return True
        except Exception as e:
            print(f"Failed to download {url}: {e}")
        return False

    async def cache_screenshot(self, appid: int, screenshot: Dict) -> Optional[str]:
        """Download and cache a screenshot, return local path"""
        ss_id = screenshot.get("id", 0)
        url = screenshot.get("path_full", "")
        if not url:
            return None

        ext = url.split(".")[-1].split("?")[0] or "jpg"
        dest = self.screenshots_dir / str(appid) / f"{ss_id}.{ext}"

        if await self._download_file(url, dest):
            return f"/cache/screenshots/{appid}/{ss_id}.{ext}"
        return None

    async def cache_video(self, appid: int, movie: Dict) -> Optional[str]:
        """Download and cache a video thumbnail, return local path"""
        movie_id = movie.get("id", 0)
        thumb_url = movie.get("thumbnail", "")
        if not thumb_url:
            return None

        dest = self.videos_dir / str(appid) / f"{movie_id}_thumb.jpg"
        if await self._download_file(thumb_url, dest):
            return f"/cache/videos/{appid}/{movie_id}_thumb.jpg"
        return None

    async def cache_achievement_icon(self, appid: int, ach: Dict) -> Dict[str, str]:
        """Download and cache achievement icons"""
        result = {"icon": "", "icon_gray": ""}
        apiname = ach.get("apiname", "unknown")
        safe_name = hashlib.md5(apiname.encode()).hexdigest()[:12]

        for key, url_key in [("icon", "icon"), ("icon_gray", "icon_gray")]:
            url = ach.get(url_key, "")
            if url:
                ext = url.split(".")[-1].split("?")[0] or "jpg"
                dest = self.icons_dir / str(appid) / f"{safe_name}_{key}.{ext}"
                if await self._download_file(url, dest):
                    result[key] = f"/cache/icons/{appid}/{safe_name}_{key}.{ext}"

        return result

    # === Full Cache Methods ===

    async def cache_game_media(self, appid: int, details: Dict) -> Dict:
        """Cache all media for a game, return updated details with local paths"""
        import asyncio
        cached_details = details.copy()

        # Cache screenshots in parallel
        screenshots = details.get("screenshots", [])[:10]
        if screenshots:
            tasks = [self.cache_screenshot(appid, ss) for ss in screenshots]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            cached_screenshots = []
            for ss, local_path in zip(screenshots, results):
                cached_ss = ss.copy()
                if isinstance(local_path, str) and local_path:
                    cached_ss["local_path"] = local_path
                cached_screenshots.append(cached_ss)
            cached_details["screenshots"] = cached_screenshots

        # Cache video thumbnails in parallel
        movies = details.get("movies", [])[:4]
        if movies:
            tasks = [self.cache_video(appid, movie) for movie in movies]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            cached_movies = []
            for movie, local_thumb in zip(movies, results):
                cached_movie = movie.copy()
                if isinstance(local_thumb, str) and local_thumb:
                    cached_movie["local_thumbnail"] = local_thumb
                cached_movies.append(cached_movie)
            cached_details["movies"] = cached_movies

        return cached_details

    async def cache_achievements_with_icons(self, appid: int, achievements: List[Dict]) -> List[Dict]:
        """Cache achievements with their icons in parallel"""
        import asyncio
        if not achievements:
            return []

        # Download all icons in parallel
        tasks = [self.cache_achievement_icon(appid, ach) for ach in achievements]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        cached_achievements = []
        for ach, icons in zip(achievements, results):
            cached_ach = ach.copy()
            if isinstance(icons, dict):
                if icons.get("icon"):
                    cached_ach["local_icon"] = icons["icon"]
                if icons.get("icon_gray"):
                    cached_ach["local_icon_gray"] = icons["icon_gray"]
            cached_achievements.append(cached_ach)
        return cached_achievements

    async def cache_news_image(self, appid: int, image_url: str) -> Optional[str]:
        """Cache a news image and return local path"""
        if not image_url:
            return None

        # Create hash for filename
        url_hash = hashlib.md5(image_url.encode()).hexdigest()[:12]
        ext = ".jpg"
        if ".png" in image_url.lower():
            ext = ".png"
        elif ".gif" in image_url.lower():
            ext = ".gif"

        game_news_dir = self.news_dir / str(appid)
        game_news_dir.mkdir(parents=True, exist_ok=True)
        local_file = game_news_dir / f"{url_hash}{ext}"

        if local_file.exists():
            return f"/cache/news/{appid}/{url_hash}{ext}"

        # Browser headers to avoid 403 from external sites
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://store.steampowered.com/",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(image_url, headers=headers)
                if response.status_code == 200:
                    with open(local_file, "wb") as f:
                        f.write(response.content)
                    return f"/cache/news/{appid}/{url_hash}{ext}"
        except Exception as e:
            print(f"Failed to cache news image: {e}")
        return None

    def _extract_image_url(self, contents: str) -> Optional[str]:
        """Extract image URL from news content with priority: static images > video thumbnails > GIF

        Priority order:
        1. Static images (jpg, jpeg, png, webp)
        2. YouTube video thumbnails
        3. Bilibili video thumbnails
        4. GIF images (last resort)
        """
        import re
        if not contents:
            return None

        # Collect all image candidates
        candidates = []

        # Extract Steam clan images
        for match in re.finditer(r'\[img\]\{STEAM_CLAN_IMAGE\}/([^/]+)/([^\[]+)\[/img\]', contents):
            url = f"https://clan.akamai.steamstatic.com/images/{match.group(1)}/{match.group(2)}"
            candidates.append(url)

        # Extract Steam clan images (variant format)
        for match in re.finditer(r'\[img\s+src=["\']?\{STEAM_CLAN_IMAGE\}/([^/]+)/([^"\'"\]\s]+)', contents):
            url = f"https://clan.akamai.steamstatic.com/images/{match.group(1)}/{match.group(2)}"
            candidates.append(url)

        # Extract HTML img tags
        for match in re.finditer(r'<img[^>]+src=["\'](https?://[^"\']+)["\']', contents):
            candidates.append(match.group(1))

        # Extract direct BBCode images
        for match in re.finditer(r'\[img\](https?://[^\[]+)\[/img\]', contents):
            candidates.append(match.group(1))

        # Extract YouTube video IDs for thumbnails
        yt_patterns = [
            r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
            r'youtu\.be/([a-zA-Z0-9_-]{11})',
            r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
        ]
        for pattern in yt_patterns:
            for match in re.finditer(pattern, contents):
                video_id = match.group(1)
                candidates.append(f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg")

        # Extract Bilibili video IDs for thumbnails
        bili_patterns = [
            r'bilibili\.com/video/(BV[a-zA-Z0-9]+)',
            r'b23\.tv/([a-zA-Z0-9]+)',
        ]
        for pattern in bili_patterns:
            for match in re.finditer(pattern, contents):
                # Bilibili thumbnails require API call, use placeholder
                candidates.append(f"https://api.bilibili.com/x/web-interface/view?bvid={match.group(1)}")

        if not candidates:
            return None

        # Sort by priority: static images first, then video thumbnails, GIF last
        def get_priority(url: str) -> int:
            url_lower = url.lower()
            if '.gif' in url_lower:
                return 3  # Lowest priority
            if 'img.youtube.com' in url_lower or 'api.bilibili.com' in url_lower:
                return 2  # Video thumbnails
            if any(ext in url_lower for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                return 1  # Highest priority
            return 2  # Default to middle priority

        candidates.sort(key=get_priority)
        return candidates[0] if candidates else None

    async def cache_news_with_images(self, appid: int, news: List[Dict]) -> List[Dict]:
        """Cache news items with their images in parallel"""
        import asyncio
        if not news:
            return []

        # Extract image URLs for first 8 items
        items_to_cache = news[:8]
        image_urls = [self._extract_image_url(item.get("contents", "")) for item in items_to_cache]

        # Download images in parallel
        tasks = [
            self.cache_news_image(appid, url) if url else asyncio.coroutine(lambda: None)()
            for url in image_urls
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Build cached news list
        cached_news = []
        for index, item in enumerate(news):
            cached_item = item.copy()
            if index < 8:
                image_url = image_urls[index] if index < len(image_urls) else None
                local_path = results[index] if index < len(results) else None
                if isinstance(local_path, str) and local_path:
                    cached_item["local_image"] = local_path
                if image_url:
                    cached_item["image_url"] = image_url
            cached_news.append(cached_item)
        return cached_news

    def get_cache_status(self, appid: int) -> Dict:
        """Get cache status for a game"""
        details_cached = (self.details_dir / f"{appid}.json").exists()
        achievements_cached = (self.achievements_dir / f"{appid}.json").exists()
        raw_achievements_cached = (self.raw_achievements_dir / f"{appid}.json").exists()
        news_cached = (self.news_json_dir / f"{appid}.json").exists()
        screenshots_dir = self.screenshots_dir / str(appid)
        icons_dir = self.icons_dir / str(appid)

        return {
            "appid": appid,
            "details_cached": details_cached,
            "details_valid": self.is_details_cache_valid(appid),
            "achievements_cached": achievements_cached,
            "achievements_valid": self.is_achievements_cache_valid(appid),
            "raw_achievements_cached": raw_achievements_cached,
            "raw_achievements_valid": self.is_raw_achievements_cache_valid(appid),
            "news_cached": news_cached,
            "news_valid": self.is_news_cache_valid(appid),
            "screenshots_count": len(list(screenshots_dir.glob("*"))) if screenshots_dir.exists() else 0,
            "icons_count": len(list(icons_dir.glob("*"))) if icons_dir.exists() else 0
        }

    def clear_cache(self, appid: int = None):
        """Clear cache for a specific game or all games"""
        import shutil
        if appid:
            for d in [self.details_dir, self.achievements_dir, self.raw_achievements_dir, self.news_json_dir]:
                f = d / f"{appid}.json"
                if f.exists():
                    f.unlink()
            for d in [self.screenshots_dir, self.videos_dir, self.icons_dir, self.news_dir]:
                p = d / str(appid)
                if p.exists():
                    shutil.rmtree(p)
        else:
            for d in [
                self.details_dir,
                self.achievements_dir,
                self.raw_achievements_dir,
                self.screenshots_dir,
                self.videos_dir,
                self.icons_dir,
                self.news_dir,
                self.news_json_dir,
            ]:
                if d.exists():
                    shutil.rmtree(d)
                d.mkdir(parents=True, exist_ok=True)


gaming_cache_service = GamingCacheService()
