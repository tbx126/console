"""Quotes, gold price and FX for the portfolio module.

No holdings, balances or quantities are sent to external providers: only
symbols. Results live in the shared cache namespaces ``quote`` and ``fx``; when
a refresh fails the last value is returned marked ``stale`` instead of an error.
"""
import math
import re
import time
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable
from urllib.parse import quote as url_quote

import httpx

from app.models.portfolio import CURRENCIES, SECURITY_SYMBOL
from app.services.cache_service import FX, QUOTES, CacheNamespace
from app.services.http_client import http_client

TROY_OUNCE_GRAMS = 31.1034768
HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}


class MarketError(Exception):
    pass


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _positive(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0


async def fetch_json(url: str, timeout: float = 8.0) -> Any:
    client = await http_client.get()
    response = await client.get(url, headers=HEADERS, timeout=timeout)
    if response.status_code != 200:
        raise MarketError(f"行情源暂不可用 ({response.status_code})")
    return response.json()


FETCH_ERRORS = (MarketError, httpx.HTTPError, ValueError, KeyError, TypeError)


class MarketService:
    def __init__(self, quotes: CacheNamespace = QUOTES, fx: CacheNamespace = FX):
        self._quotes = quotes
        self._fx = fx
        self.fetch_json: Callable[[str], Awaitable[Any]] = fetch_json

    @staticmethod
    async def _cached(namespace: CacheNamespace, key: str, fetcher: Callable[[], Awaitable[dict]]) -> dict:
        try:
            return await namespace.get_or_fetch(
                key, fetcher, retry_on=FETCH_ERRORS, mark_stale=lambda old: {**old, "stale": True}
            )
        except FETCH_ERRORS as error:
            raise MarketError(str(error) or "暂无报价") from error

    async def quote(self, symbol: str) -> dict:
        if not re.match(SECURITY_SYMBOL, symbol):
            raise MarketError("无效的证券代码")
        return await self._cached(self._quotes, symbol, lambda: self._fetch_quote(symbol))

    async def _fetch_quote(self, symbol: str) -> dict:
        if symbol == "XAU":
            data = await self.fetch_json("https://api.gold-api.com/price/XAU")
            price, updated = data.get("price"), data.get("updatedAt")
            if not _positive(price) or not isinstance(updated, str) or data.get("currency") not in (None, "USD"):
                raise MarketError("黄金报价格式无效")
            asof = datetime.fromisoformat(updated.replace("Z", "+00:00"))
            if asof.tzinfo is None:
                asof = asof.replace(tzinfo=timezone.utc)
            return {
                "price": price / TROY_OUNCE_GRAMS,
                "currency": "USD",
                "asOf": _iso(asof.timestamp()),
                "fetchedAt": int(time.time() * 1000),
                "source": "Gold API · 国际金价 / 克",
            }
        last: Exception = MarketError("暂无报价")
        for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
            try:
                data = await self.fetch_json(f"https://{host}/v8/finance/chart/{url_quote(symbol, safe='')}?interval=1d&range=5d")
                result = ((data.get("chart") or {}).get("result") or [None])[0]
                meta = (result or {}).get("meta") or {}
                price, market_time, currency = meta.get("regularMarketPrice"), meta.get("regularMarketTime"), meta.get("currency")
                if not _positive(price) or not _positive(market_time) or currency not in CURRENCIES:
                    raise MarketError("暂无支持的报价，请核对代码和币种")
                if str(meta.get("symbol", "")).upper() != symbol:
                    raise MarketError("行情代码不匹配")
                return {
                    "price": price,
                    "currency": currency,
                    "asOf": _iso(market_time),
                    "fetchedAt": int(time.time() * 1000),
                    "source": "Yahoo Finance · 延迟行情",
                }
            except (MarketError, httpx.HTTPError, ValueError, AttributeError) as error:
                last = error
        raise MarketError(str(last))

    async def fx(self) -> dict:
        return await self._cached(self._fx, "USD", self._fetch_fx)

    async def _fetch_fx(self) -> dict:
        entries = await self.fetch_json("https://api.frankfurter.dev/v2/rates?base=USD&quotes=SGD,CNY,HKD")
        if not isinstance(entries, list):
            raise MarketError("汇率格式无效")
        rates = {"USD": 1, "SGD": 0, "CNY": 0, "HKD": 0}
        dates = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            code, rate, day = entry.get("quote"), entry.get("rate"), entry.get("date")
            if code in CURRENCIES and entry.get("base") == "USD" and _positive(rate) and isinstance(day, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
                rates[code] = rate
                dates.append(day)
        if any(rates[c] <= 0 for c in CURRENCIES):
            raise MarketError("汇率数据不完整")
        return {"rates": rates, "asOf": sorted(dates)[0], "fetchedAt": int(time.time() * 1000), "source": "Frankfurter · 每日参考汇率"}


market_service = MarketService()
