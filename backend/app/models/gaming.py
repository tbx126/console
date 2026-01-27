"""Gaming models for Steam integration"""
from pydantic import BaseModel
from typing import Optional, List


class Achievement(BaseModel):
    """Game achievement model"""
    api_name: str
    name: str
    description: Optional[str] = None
    achieved: bool = False
    unlock_time: Optional[int] = None  # Unix timestamp
    icon: Optional[str] = None
    icon_gray: Optional[str] = None


class Game(BaseModel):
    """Steam game model"""
    appid: int
    name: str
    playtime_forever: int = 0  # Total playtime in minutes
    playtime_2weeks: Optional[int] = None  # Recent playtime in minutes
    img_icon_url: Optional[str] = None
    img_logo_url: Optional[str] = None
    has_community_visible_stats: Optional[bool] = None
    achievements: Optional[List[Achievement]] = None
    achievement_count: int = 0
    achieved_count: int = 0
    last_played: Optional[int] = None  # Unix timestamp


class GamingStatistics(BaseModel):
    """Gaming statistics model"""
    total_games: int = 0
    total_playtime: int = 0  # Total playtime in minutes
    total_achievements: int = 0
    unlocked_achievements: int = 0
    recent_playtime: int = 0  # Last 2 weeks in minutes
    most_played_game: Optional[str] = None
    most_played_time: int = 0
    games_with_achievements: int = 0
    perfect_games: int = 0  # Games with 100% achievements


class SteamConfig(BaseModel):
    """Steam API configuration"""
    api_key: Optional[str] = None
    steam_id: Optional[str] = None
