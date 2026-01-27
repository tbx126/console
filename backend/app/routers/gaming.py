"""Gaming API routes for Steam integration"""
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services.gaming_service import gaming_service
from app.services.gaming_cache_service import gaming_cache_service
from app.models.gaming import GamingStatistics

router = APIRouter()

# Background cache task state
_cache_task_state = {
    "running": False,
    "total": 0,
    "completed": 0,
    "current_game": None,
    "errors": []
}


@router.get("/games")
async def get_games():
    """Get all games from cache or fetch from Steam"""
    games = await gaming_service.fetch_owned_games()
    return {"games": games, "count": len(games)}


@router.get("/statistics")
async def get_statistics():
    """Get gaming statistics"""
    return gaming_service.get_statistics()


@router.post("/sync")
async def sync_games(background_tasks: BackgroundTasks):
    """Force sync games from Steam API and cache uncached games in background"""
    games = await gaming_service.fetch_owned_games()

    # Find uncached or expired games
    uncached = []
    for game in games:
        appid = game.get("appid")
        status = gaming_cache_service.get_cache_status(appid)
        details_valid = status.get("details_valid", False)
        achievements_valid = status.get("achievements_valid", False)
        raw_achievements_valid = status.get("raw_achievements_valid", False)
        # Check if any cache is invalid or expired
        if not details_valid or not achievements_valid or not raw_achievements_valid:
            uncached.append(game)

    # Start background caching if there are uncached games
    if uncached and not _cache_task_state["running"]:
        background_tasks.add_task(cache_games_background, uncached)

    return {
        "message": "Sync completed",
        "games_count": len(games),
        "uncached_count": len(uncached),
        "caching_started": len(uncached) > 0 and not _cache_task_state["running"]
    }


@router.get("/games/{appid}/achievements")
async def get_game_achievements(appid: int):
    """Get achievements for a specific game"""
    achievements = await gaming_service.fetch_game_achievements(appid)
    return {"achievements": achievements, "count": len(achievements)}


@router.get("/games/{appid}/achievements-detailed")
async def get_detailed_achievements(appid: int):
    """Get achievements with full details (name, description, icons)"""
    achievements = await gaming_service.fetch_detailed_achievements(appid)
    return {"achievements": achievements, "count": len(achievements)}


@router.get("/games/{appid}/details")
async def get_game_details(appid: int):
    """Get detailed game info from Steam Store"""
    details = await gaming_service.fetch_game_details(appid)
    if not details:
        raise HTTPException(status_code=404, detail="Game details not found")
    return details


@router.get("/games/{appid}/news")
async def get_game_news(appid: int, count: int = 10):
    """Get news/updates for a specific game"""
    news = await gaming_service.fetch_game_news(appid, count)
    return {"news": news, "count": len(news)}


@router.get("/games/{appid}")
async def get_game(appid: int):
    """Get a specific game by appid"""
    game = gaming_service.get_game(appid)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


@router.get("/cache/status/{appid}")
async def get_cache_status(appid: int):
    """Get cache status for a specific game"""
    return gaming_cache_service.get_cache_status(appid)


@router.delete("/cache/{appid}")
async def clear_game_cache(appid: int):
    """Clear cache for a specific game"""
    gaming_cache_service.clear_cache(appid)
    return {"message": f"Cache cleared for game {appid}"}


@router.post("/cache/refresh/{appid}")
async def refresh_game_cache(appid: int):
    """Force refresh cache for a specific game"""
    gaming_cache_service.clear_cache(appid)
    details = await gaming_service.fetch_game_details(appid)
    achievements = await gaming_service.fetch_detailed_achievements(appid)
    return {
        "message": "Cache refreshed",
        "details_cached": details is not None,
        "achievements_count": len(achievements)
    }


@router.get("/cache/sync-status")
async def get_cache_sync_status():
    """Get background cache sync status"""
    return _cache_task_state.copy()


async def cache_games_background(games: list):
    """Background task to cache all uncached games"""
    global _cache_task_state
    _cache_task_state["running"] = True
    _cache_task_state["total"] = len(games)
    _cache_task_state["completed"] = 0
    _cache_task_state["errors"] = []

    for game in games:
        appid = game.get("appid")
        name = game.get("name", f"Game {appid}")
        _cache_task_state["current_game"] = name

        try:
            await gaming_service.fetch_game_details(appid)
            await gaming_service.fetch_detailed_achievements(appid)
        except Exception as e:
            _cache_task_state["errors"].append({"appid": appid, "error": str(e)})

        _cache_task_state["completed"] += 1
        await asyncio.sleep(0.5)  # Rate limiting

    _cache_task_state["running"] = False
    _cache_task_state["current_game"] = None
