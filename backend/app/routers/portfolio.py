"""Portfolio (folio) API: shared holdings, quotes, FX and instrument search."""
import json
import logging
import re

from fastapi import APIRouter, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.models.portfolio import CATEGORIES, AppendSnapshotRequest, SavePortfolioRequest, dump_shared
from app.services.instrument_search import instrument_search
from app.services.market_service import MarketError, market_service
from app.services.portfolio_store import RevisionConflict, portfolio_store

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_BODY_BYTES = 1024 * 1024
NO_STORE = {"Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff"}
SYMBOL = re.compile(r"^[A-Z0-9][A-Z0-9.^=-]{0,23}$")


def _json(data, status: int = 200, headers: dict | None = None) -> JSONResponse:
    return JSONResponse(data, status_code=status, headers=headers or NO_STORE)


def _error(message: str, status: int) -> JSONResponse:
    return _json({"error": message}, status)


def _same_site_json(request: Request) -> bool:
    """Writes must be JSON from this site; blocks simple cross-site form posts."""
    content_type = request.headers.get("content-type", "").split(";")[0].strip()
    return content_type == "application/json" and request.headers.get("sec-fetch-site") != "cross-site"


async def _body(request: Request):
    if int(request.headers.get("content-length") or 0) > MAX_BODY_BYTES:
        raise OverflowError()
    raw = b""
    async for chunk in request.stream():
        raw += chunk
        if len(raw) > MAX_BODY_BYTES:
            raise OverflowError()
    return json.loads(raw)


@router.get("")
async def read_portfolio():
    try:
        shared = await run_in_threadpool(portfolio_store.read)
    except (OSError, ValueError, ValidationError):
        logger.exception("Portfolio file is unreadable")
        return _error("NAS 数据暂不可读，未覆盖已保存文件", 503)
    return _json(dump_shared(shared))


async def _mutate(request: Request, snapshot: bool) -> JSONResponse:
    if not _same_site_json(request):
        return _error("仅接受本站 JSON 请求", 403)
    try:
        payload = await _body(request)
    except OverflowError:
        return _error("文件不能超过 1 MB", 413)
    except ValueError:
        return _error("JSON 无效", 400)
    try:
        if snapshot:
            data = AppendSnapshotRequest.model_validate(payload)
            result = await run_in_threadpool(portfolio_store.append, data.revision, data.snapshot)
        else:
            data = SavePortfolioRequest.model_validate(payload)
            result = await run_in_threadpool(portfolio_store.save, data.revision, data.portfolio)
    except ValidationError:
        return _error("快照格式无效" if snapshot else "持仓格式无效", 400)
    except RevisionConflict:
        return _error("另一设备已修改持仓，请同步最新数据后再保存", 409)
    except (OSError, ValueError):
        logger.exception("Portfolio save failed")
        return _error("NAS 保存失败，已保留原数据", 503)
    return _json(dump_shared(result))


@router.put("")
async def save_portfolio(request: Request):
    return await _mutate(request, snapshot=False)


@router.post("")
async def append_snapshot(request: Request):
    return await _mutate(request, snapshot=True)


@router.get("/quote")
async def get_quote(symbol: str = Query("", max_length=24)):
    if not SYMBOL.match(symbol):
        return _error("无效代码", 400)
    try:
        data = await market_service.quote(symbol)
    except MarketError:
        return _error("暂时无法获取报价，请核对代码或稍后刷新", 502)
    return _json(data, headers={"Cache-Control": "private, max-age=60"})


@router.get("/fx")
async def get_fx():
    try:
        data = await market_service.fx()
    except MarketError:
        return _error("汇率暂不可用", 502)
    return _json(data, headers={"Cache-Control": "private, max-age=3600"})


@router.get("/search")
async def search(category: str = "", q: str = ""):
    query = q.strip()
    if category not in CATEGORIES or len(query) > 80 or re.search(r"[\x00-\x1F]", query):
        return _error("无效搜索条件", 400)
    result = await instrument_search.search(category, query)
    return _json(result, headers={"Cache-Control": "private, max-age=30"})
