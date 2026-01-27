"""Gaming service for Steam API integration"""
from typing import List, Dict, Optional
import httpx
from app.models.gaming import Game, Achievement, GamingStatistics
from app.services.data_manager import data_manager
from app.services.gaming_cache_service import gaming_cache_service
from app.config import settings


class GamingService:
    """Service for managing gaming data via Steam API"""

    STEAM_API_BASE = "https://api.steampowered.com"
    STEAM_STORE_API = "https://store.steampowered.com/api"

    def __init__(self):
        self.data_file = "gaming.json"

    def _get_steam_config(self) -> Dict:
        """Get Steam API configuration"""
        config_data = data_manager.read_data(settings.config_data_file)
        api_keys = config_data.get("api_keys", {})
        return {
            "api_key": api_keys.get("steam_api_key", ""),
            "steam_id": api_keys.get("steam_id", "")
        }

    def _get_cached_games(self) -> List[Dict]:
        """Get cached games from local storage"""
        data = data_manager.read_data(self.data_file)
        return data.get("games", [])

    def _save_games(self, games: List[Dict]):
        """Save games to local storage"""
        data = data_manager.read_data(self.data_file)
        data["games"] = games
        data_manager.write_data(self.data_file, data)

    async def fetch_owned_games(self) -> List[Dict]:
        """Fetch owned games from Steam API"""
        config = self._get_steam_config()
        if not config["api_key"] or not config["steam_id"]:
            return self._get_cached_games()

        url = f"{self.STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/"
        params = {
            "key": config["api_key"],
            "steamid": config["steam_id"],
            "include_appinfo": True,
            "include_played_free_games": True
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                games = data.get("response", {}).get("games", [])
                self._save_games(games)
                return games
        except Exception as e:
            print(f"Failed to fetch Steam games: {e}")
            return self._get_cached_games()

    async def fetch_game_achievements(self, appid: int) -> List[Dict]:
        """Fetch achievements for a specific game"""
        # Check cache first
        cached = gaming_cache_service.get_cached_raw_achievements(appid)
        if cached is not None:
            return cached

        config = self._get_steam_config()
        if not config["api_key"] or not config["steam_id"]:
            return []

        url = f"{self.STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/"
        params = {
            "key": config["api_key"],
            "steamid": config["steam_id"],
            "appid": appid
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                if response.status_code != 200:
                    gaming_cache_service.save_raw_achievements(appid, [])
                    return []
                data = response.json()
                achievements = data.get("playerstats", {}).get("achievements", [])
                gaming_cache_service.save_raw_achievements(appid, achievements)
                return achievements
        except Exception as e:
            print(f"Failed to fetch achievements for {appid}: {e}")
            return []

    def get_statistics(self) -> GamingStatistics:
        """Calculate gaming statistics from cached data"""
        games = self._get_cached_games()

        total_playtime = sum(g.get("playtime_forever", 0) for g in games)
        recent_playtime = sum(g.get("playtime_2weeks", 0) or 0 for g in games)

        most_played = max(games, key=lambda g: g.get("playtime_forever", 0)) if games else None

        return GamingStatistics(
            total_games=len(games),
            total_playtime=total_playtime,
            recent_playtime=recent_playtime,
            most_played_game=most_played.get("name") if most_played else None,
            most_played_time=most_played.get("playtime_forever", 0) if most_played else 0
        )

    def get_games(self) -> List[Dict]:
        """Get cached games list"""
        return self._get_cached_games()

    def get_game(self, appid: int) -> Optional[Dict]:
        """Get a specific game by appid"""
        games = self._get_cached_games()
        for game in games:
            if game.get("appid") == appid:
                return game
        return None

    async def fetch_game_details(self, appid: int) -> Optional[Dict]:
        """Fetch detailed game info from cache or Steam Store API"""
        # Check cache first
        cached = gaming_cache_service.get_cached_details(appid)
        if cached is not None:
            return cached

        url = f"{self.STEAM_STORE_API}/appdetails"
        params = {"appids": appid, "l": "english"}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                if response.status_code != 200:
                    return None
                data = response.json()
                game_data = data.get(str(appid), {})
                if not game_data.get("success"):
                    return None
                details = game_data.get("data")

                # Cache details and media
                if details:
                    cached_details = await gaming_cache_service.cache_game_media(appid, details)
                    gaming_cache_service.save_details(appid, cached_details)
                    return cached_details

                return details
        except Exception as e:
            print(f"Failed to fetch game details for {appid}: {e}")
            return None

    async def fetch_achievement_schema(self, appid: int) -> List[Dict]:
        """Fetch achievement schema (names, descriptions, icons) from Steam API"""
        config = self._get_steam_config()
        if not config["api_key"]:
            return []

        url = f"{self.STEAM_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/"
        params = {"key": config["api_key"], "appid": appid}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                if response.status_code != 200:
                    return []
                data = response.json()
                stats = data.get("game", {}).get("availableGameStats", {})
                return stats.get("achievements", [])
        except Exception as e:
            print(f"Failed to fetch achievement schema for {appid}: {e}")
            return []

    async def fetch_detailed_achievements(self, appid: int) -> List[Dict]:
        """Fetch achievements with full details (status + schema merged)"""
        # Check cache first
        cached = gaming_cache_service.get_cached_achievements(appid)
        if cached is not None:
            return cached

        player_achievements = await self.fetch_game_achievements(appid)
        schema = await self.fetch_achievement_schema(appid)

        # Create schema lookup by name
        schema_map = {ach["name"]: ach for ach in schema}

        # Merge player status with schema
        detailed = []
        for ach in player_achievements:
            api_name = ach.get("apiname", "")
            schema_info = schema_map.get(api_name, {})
            detailed.append({
                "apiname": api_name,
                "name": schema_info.get("displayName", api_name),
                "description": schema_info.get("description", ""),
                "icon": schema_info.get("icon", ""),
                "icon_gray": schema_info.get("icongray", ""),
                "achieved": ach.get("achieved", 0),
                "unlock_time": ach.get("unlocktime", 0)
            })

        # Cache with icons (also cache empty results to avoid repeated API calls)
        cached_achievements = await gaming_cache_service.cache_achievements_with_icons(appid, detailed)
        gaming_cache_service.save_achievements(appid, cached_achievements)
        return cached_achievements


    async def fetch_game_news(self, appid: int, count: int = 10) -> List[Dict]:
        """Fetch news/updates for a specific game from Steam News API"""
        # Check cache first
        cached = gaming_cache_service.get_cached_news(appid, count)
        if cached is not None:
            return cached

        url = f"{self.STEAM_API_BASE}/ISteamNews/GetNewsForApp/v2/"
        params = {
            "appid": appid,
            "count": count,
            "maxlength": 0,  # 0 = full content (needed for image extraction)
            "format": "json"
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                if response.status_code != 200:
                    gaming_cache_service.save_news(appid, [])
                    return []
                data = response.json()
                news = data.get("appnews", {}).get("newsitems", [])
                # Cache news images and JSON
                cached_news = await gaming_cache_service.cache_news_with_images(appid, news)
                gaming_cache_service.save_news(appid, cached_news)
                return cached_news
        except Exception as e:
            print(f"Failed to fetch news for {appid}: {e}")
            return []


gaming_service = GamingService()
