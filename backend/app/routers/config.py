"""Configuration API routes"""
from fastapi import APIRouter
from app.models.config import APIKeysConfig
from app.services.data_manager import data_manager
from app.config import settings

router = APIRouter()


def mask_key(key: str) -> str:
    """Mask API key for display"""
    if not key or len(key) < 8:
        return ""
    return key[:4] + "*" * (len(key) - 8) + key[-4:]


@router.get("/api-keys")
async def get_api_keys():
    """Get API keys (masked for security)"""
    data = data_manager.read_data(settings.config_data_file)
    api_keys = data.get("api_keys", {})

    return {
        "alpha_vantage_key": mask_key(api_keys.get("alpha_vantage_key", "")),
        "coingecko_key": mask_key(api_keys.get("coingecko_key", "")),
        "exchange_rate_key": mask_key(api_keys.get("exchange_rate_key", "")),
        "has_alpha_vantage": bool(api_keys.get("alpha_vantage_key")),
        "has_coingecko": bool(api_keys.get("coingecko_key")),
        "has_exchange_rate": bool(api_keys.get("exchange_rate_key")),
        # Flight APIs
        "has_aerodatabox": bool(api_keys.get("aerodatabox_key")),
        "has_airlabs": bool(api_keys.get("airlabs_key")),
        "has_aviationstack": bool(api_keys.get("aviationstack_key")),
        "has_opensky": bool(api_keys.get("opensky_username") and api_keys.get("opensky_password")),
        # Maps
        "has_google_maps": bool(api_keys.get("google_maps_key")),
        # Steam
        "has_steam": bool(api_keys.get("steam_api_key") and api_keys.get("steam_id")),
        "steam_id": api_keys.get("steam_id", "")
    }


@router.put("/api-keys")
async def update_api_keys(config: APIKeysConfig):
    """Update API keys"""
    data = data_manager.read_data(settings.config_data_file)

    if "api_keys" not in data:
        data["api_keys"] = {}

    # Only update non-empty values
    if config.alpha_vantage_key:
        data["api_keys"]["alpha_vantage_key"] = config.alpha_vantage_key
    if config.coingecko_key:
        data["api_keys"]["coingecko_key"] = config.coingecko_key
    if config.exchange_rate_key:
        data["api_keys"]["exchange_rate_key"] = config.exchange_rate_key
    # Flight APIs
    if config.aerodatabox_key:
        data["api_keys"]["aerodatabox_key"] = config.aerodatabox_key
    if config.airlabs_key:
        data["api_keys"]["airlabs_key"] = config.airlabs_key
    if config.aviationstack_key:
        data["api_keys"]["aviationstack_key"] = config.aviationstack_key
    if config.opensky_username:
        data["api_keys"]["opensky_username"] = config.opensky_username
    if config.opensky_password:
        data["api_keys"]["opensky_password"] = config.opensky_password
    # Maps
    if config.google_maps_key:
        data["api_keys"]["google_maps_key"] = config.google_maps_key
    # Steam
    if config.steam_api_key:
        data["api_keys"]["steam_api_key"] = config.steam_api_key
    if config.steam_id:
        data["api_keys"]["steam_id"] = config.steam_id

    data_manager.write_data(settings.config_data_file, data)

    return {"message": "API keys updated successfully"}


@router.delete("/api-keys/{key_name}")
async def delete_api_key(key_name: str):
    """Delete a specific API key"""
    data = data_manager.read_data(settings.config_data_file)

    if "api_keys" in data and key_name in data["api_keys"]:
        del data["api_keys"][key_name]
        data_manager.write_data(settings.config_data_file, data)

    return {"message": f"API key '{key_name}' deleted"}


@router.get("/google-maps-key")
async def get_google_maps_key():
    """Get Google Maps API key for frontend use"""
    data = data_manager.read_data(settings.config_data_file)
    api_keys = data.get("api_keys", {})
    return {"key": api_keys.get("google_maps_key", "")}
