"""Cache inspection and invalidation."""
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool

from app.config import settings
from app.services.cache_service import cache_service
from app.services.data_manager import data_manager
from app.services.gaming_cache_service import gaming_cache_service

router = APIRouter()


def _disk_usage() -> dict:
    root = settings.data_dir / "gaming_cache"
    total = files = 0
    if root.exists():
        for path in root.rglob("*"):
            if path.is_file():
                files += 1
                total += path.stat().st_size
    return {"bytes": total, "files": files, "max_bytes": settings.gaming_cache_max_size_mb * 1024 * 1024}


@router.get("")
async def cache_overview():
    gaming = gaming_cache_service.cache_info()
    return {
        "namespaces": cache_service.info(),
        "steam": {"label": "Steam 详情 / 成就 / 新闻", **gaming["json_memory"], "disk": await run_in_threadpool(_disk_usage)},
        "data": {"label": "数据文件读缓存", **data_manager.cache_info()},
    }


@router.delete("")
async def clear_all():
    cache_service.clear()
    data_manager.invalidate()
    return {"cleared": ["*"]}


@router.delete("/{name}")
async def clear_namespace(name: str):
    if name == "steam":
        await run_in_threadpool(gaming_cache_service.clear_cache)
    elif name == "data":
        data_manager.invalidate()
    elif not cache_service.clear(name):
        raise HTTPException(status_code=404, detail=f"Unknown cache namespace: {name}")
    return {"cleared": [name]}
