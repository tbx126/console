"""Configuration API routes"""
from fastapi import APIRouter
from app.models.config import APIKeysConfig
from app.services.data_manager import data_manager
from app.config import settings
from app.services.cache_service import FLIGHT_LOOKUP

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
    updates = {key: value for key, value in config.model_dump().items() if value}

    def mutate(data):
        data.setdefault("api_keys", {}).update(updates)

    data_manager.update_data(settings.config_data_file, mutate)
    # New credentials can turn earlier misses into hits.
    FLIGHT_LOOKUP.clear()

    return {"message": "API keys updated successfully"}


@router.delete("/api-keys/{key_name}")
async def delete_api_key(key_name: str):
    """Delete a specific API key"""
    def mutate(data):
        return data.get("api_keys", {}).pop(key_name, None) is not None

    data_manager.update_data(settings.config_data_file, mutate, write_if=bool)

    return {"message": f"API key '{key_name}' deleted"}


@router.get("/google-maps-key")
async def get_google_maps_key():
    """Get Google Maps API key for frontend use"""
    data = data_manager.read_data(settings.config_data_file)
    api_keys = data.get("api_keys", {})
    return {"key": api_keys.get("google_maps_key", "")}
