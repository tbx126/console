"""Configuration models"""
from pydantic import BaseModel
from typing import Optional


class APIKeysConfig(BaseModel):
    """API Keys configuration"""
    alpha_vantage_key: Optional[str] = None
    coingecko_key: Optional[str] = None
    exchange_rate_key: Optional[str] = None
    # Flight APIs
    aerodatabox_key: Optional[str] = None
    airlabs_key: Optional[str] = None
    aviationstack_key: Optional[str] = None
    opensky_username: Optional[str] = None
    opensky_password: Optional[str] = None
    # Maps
    google_maps_key: Optional[str] = None
    # Steam
    steam_api_key: Optional[str] = None
    steam_id: Optional[str] = None


class AppSettings(BaseModel):
    """General app settings - 预留扩展"""
    currency: str = "USD"
    date_format: str = "YYYY-MM-DD"
    timezone: str = "UTC"
    theme: str = "light"
