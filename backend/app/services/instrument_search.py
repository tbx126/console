"""Instrument search for the portfolio asset editor.

Sources: Yahoo Finance search (securities, crypto), Eastmoney suggest (Chinese
securities) and Tiantian fund search (funds). Only names, symbols, markets and
currencies are returned; no account data is read.
"""
import asyncio
import re
from typing import Any, Awaitable, Callable, Dict, List
from urllib.parse import quote

import httpx

from app.services.cache_service import SEARCH, CacheNamespace
from app.services.market_service import MarketError, fetch_json

SYMBOL = re.compile(r"^[A-Z0-9][A-Z0-9.^=-]{0,23}$")
NON_ASCII = re.compile(r"[^\x00-\x7F]")

COMMON_INSTRUMENTS: List[dict] = [
    {"category": "cash", "symbol": "SGD", "name": "新加坡元现金", "currency": "SGD", "market": "现金"},
    {"category": "cash", "symbol": "CNY", "name": "人民币现金", "currency": "CNY", "market": "现金"},
    {"category": "cash", "symbol": "USD", "name": "美元现金", "currency": "USD", "market": "现金"},
    {"category": "cash", "symbol": "HKD", "name": "港币现金", "currency": "HKD", "market": "现金"},
    {"category": "stock", "symbol": "AAPL", "name": "苹果 Apple", "currency": "USD", "market": "美股"},
    {"category": "stock", "symbol": "NVDA", "name": "英伟达 NVIDIA", "currency": "USD", "market": "美股"},
    {"category": "stock", "symbol": "0700.HK", "name": "腾讯控股", "currency": "HKD", "market": "港股"},
    {"category": "stock", "symbol": "600519.SS", "name": "贵州茅台", "currency": "CNY", "market": "A 股 · 沪市"},
    {"category": "stock", "symbol": "D05.SI", "name": "星展集团 DBS", "currency": "SGD", "market": "新加坡"},
    {"category": "stock", "symbol": "SPY", "name": "SPDR S&P 500 ETF", "currency": "USD", "market": "美股 ETF"},
    {"category": "stock", "symbol": "QQQ", "name": "Invesco QQQ Trust", "currency": "USD", "market": "美股 ETF"},
    {"category": "fund", "symbol": "006075", "name": "博时标普500ETF联接(QDII)C", "currency": "CNY", "market": "场外基金 · 人民币"},
    {"category": "gold", "symbol": "XAU", "name": "工商银行积存金", "currency": "USD", "market": "克 · 国际金价参考"},
    {"category": "crypto", "symbol": "BTC-USD", "name": "比特币 Bitcoin", "currency": "USD", "market": "加密货币"},
    {"category": "crypto", "symbol": "ETH-USD", "name": "以太坊 Ethereum", "currency": "USD", "market": "加密货币"},
]

US_EXCHANGES = {"NMS", "NGM", "NCM", "NYQ", "PCX", "ASE", "BTS", "PNK", "OQB", "OQX"}


def _rows(value: Any) -> List[dict]:
    return [r for r in value if isinstance(r, dict)] if isinstance(value, list) else []


def _text(value: Any) -> str:
    return value.strip()[:180] if isinstance(value, str) else ""


def local_instruments(category: str, query: str) -> List[dict]:
    key = re.sub(r"\s", "", query).lower()
    return [
        i for i in COMMON_INSTRUMENTS
        if i["category"] == category and key in re.sub(r"\s", "", i["symbol"] + i["name"]).lower()
    ]


def merge_instruments(*lists: List[dict]) -> List[dict]:
    unique: Dict[str, dict] = {}
    for items in lists:
        for item in items:
            unique.setdefault(item["symbol"], item)
    return list(unique.values())[:20]


def parse_yahoo(data: Any, category: str) -> List[dict]:
    found = []
    for r in _rows((data or {}).get("quotes") if isinstance(data, dict) else None):
        symbol = _text(r.get("symbol")).upper()
        name = _text(r.get("longname")) or _text(r.get("shortname"))
        if not SYMBOL.match(symbol) or not name:
            continue
        quote_type = _text(r.get("quoteType"))
        if category == "crypto":
            if quote_type == "CRYPTOCURRENCY" and re.fullmatch(r"[A-Z0-9]+-USD", symbol):
                found.append({"symbol": symbol, "name": name, "currency": "USD", "market": "加密货币", "category": category})
            continue
        if category != "stock" or quote_type not in ("EQUITY", "ETF"):
            continue
        exchange = _text(r.get("exchange"))
        if re.fullmatch(r"\d{4,5}\.HK", symbol) and int(symbol.split(".")[0]) < 80000:
            currency, market = "HKD", "港股"
        elif re.fullmatch(r"\d{6}\.(SS|SZ)", symbol):
            currency, market = "CNY", "A 股"
        elif symbol.endswith(".SI") and exchange == "SES":
            currency, market = "SGD", "新加坡"
        elif exchange in US_EXCHANGES and "." not in symbol:
            currency, market = "USD", "美股 ETF" if quote_type == "ETF" else "美股"
        else:
            continue
        found.append({"symbol": symbol, "name": name, "currency": currency, "market": market, "category": "stock"})
    return found


def parse_east_stocks(data: Any) -> List[dict]:
    table = data.get("QuotationCodeTable") if isinstance(data, dict) else None
    found = []
    for r in _rows(table.get("Data") if isinstance(table, dict) else None):
        code, name = _text(r.get("Code")), _text(r.get("Name"))
        if not code or not name:
            continue
        classify, mkt, type_us = r.get("Classify"), _text(r.get("MktNum")), _text(r.get("TypeUS"))
        if classify == "AStock" and re.fullmatch(r"\d{6}", code) and mkt in ("0", "1"):
            symbol, currency, market = f"{code}.{'SS' if mkt == '1' else 'SZ'}", "CNY", "A 股"
        elif classify == "HK" and type_us == "3" and re.fullmatch(r"\d{5}", code) and int(code) < 80000:
            symbol, currency, market = f"{int(code):04d}.HK", "HKD", "港股"
        elif classify == "UsStock" and type_us in ("1", "2", "3") and re.fullmatch(r"[A-Z][A-Z0-9-]{0,15}", code) and _text(r.get("JYS")) in ("NYSE", "NASDAQ", "AMEX"):
            symbol, currency, market = code, "USD", "美股"
        else:
            continue
        found.append({"symbol": symbol, "name": name, "currency": currency, "market": market, "category": "stock"})
    return found


def parse_funds(data: Any) -> List[dict]:
    found = []
    for r in _rows(data.get("Datas") if isinstance(data, dict) else None):
        symbol = _text(r.get("CODE"))
        base = r.get("FundBaseInfo")
        name = _text(r.get("NAME")) or _text(base.get("SHORTNAME") if isinstance(base, dict) else None)
        if not re.fullmatch(r"\d{6}", symbol) or not name or not isinstance(base, dict) or re.search(r"美元|美金|USD", name, re.I):
            continue
        found.append({"symbol": symbol, "name": name, "currency": "CNY", "market": "基金 · 人民币市值", "category": "fund"})
    return found


class InstrumentSearch:
    def __init__(self, cache: CacheNamespace = SEARCH):
        self._cache = cache
        self.fetch_json: Callable[[str], Awaitable[Any]] = lambda url: fetch_json(url, timeout=5.5)

    async def search(self, category: str, query: str) -> dict:
        local = local_instruments(category, query)
        if category in ("cash", "gold") or (not query and category != "fund"):
            return {"items": local, "partial": False}
        return await self._cache.get_or_fetch(
            f"{category}:{query.lower()}",
            lambda: self._search_remote(category, query, local),
            ttl_for=lambda result: 10 if result["partial"] else 60,
        )

    async def _search_remote(self, category: str, query: str, local: List[dict]) -> dict:
        jobs: List[Awaitable[List[dict]]] = []

        async def run(url: str, parse: Callable[[Any], List[dict]]) -> List[dict]:
            return parse(await self.fetch_json(url))

        if category == "fund":
            jobs.append(run(f"https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key={quote(query or '标普500')}&pagesize=15", parse_funds))
        else:
            chinese = bool(NON_ASCII.search(query))
            alias = next((i["symbol"] for i in local), None) if chinese else None
            if not chinese or alias or category == "crypto":
                jobs.append(run(
                    f"https://query1.finance.yahoo.com/v1/finance/search?q={quote(alias or query)}&quotesCount=20&newsCount=0&enableFuzzyQuery=false",
                    lambda d: parse_yahoo(d, category),
                ))
            if category == "stock":
                jobs.append(run(f"https://searchapi.eastmoney.com/api/suggest/get?input={quote(query)}&type=14&count=15", parse_east_stocks))
        results = await asyncio.gather(*jobs, return_exceptions=True)
        failures = (MarketError, httpx.HTTPError, ValueError, TypeError, AttributeError)
        for r in results:
            if isinstance(r, BaseException) and not isinstance(r, failures):
                raise r
        partial = any(isinstance(r, BaseException) for r in results)
        return {"items": merge_instruments(local, *[r for r in results if not isinstance(r, BaseException)]), "partial": partial}


instrument_search = InstrumentSearch()
