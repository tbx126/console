import asyncio
import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.portfolio import Snapshot
from app.routers import portfolio as portfolio_router
from app.services.instrument_search import InstrumentSearch, parse_east_stocks, parse_funds, parse_yahoo
from app.services.market_service import MarketError, MarketService
from app.services.portfolio_store import PortfolioStore, merge_history

PORTFOLIO = {
    "version": 1,
    "asOf": "2026-10-03T00:00:00+08:00",
    "assets": [
        {"id": "cash", "name": "新加坡元现金", "category": "cash", "currency": "SGD", "amount": 1000, "cost": 5},
        {"id": "apple", "name": "苹果", "category": "stock", "symbol": "AAPL", "currency": "USD", "quantity": 10},
        {"id": "qdii", "name": "标普500 QDII", "category": "fund", "currency": "CNY", "quantity": 100, "marketValue": 350, "group": "sp500"},
        {"id": "icbc", "name": "工商银行积存金", "category": "gold", "quantity": 20},
        {"id": "btc", "name": "比特币", "category": "crypto", "symbol": "BTC-USD", "currency": "USD", "quantity": 0.01},
    ],
}
JSON = {"Content-Type": "application/json"}


def snapshot(at: str) -> dict:
    return {"at": at, "totals": {"SGD": 1, "USD": 1, "CNY": 1, "HKD": 1}, "cached": False}


@pytest.fixture
def client(tmp_path, monkeypatch):
    store = PortfolioStore(tmp_path / "portfolio.json")
    monkeypatch.setattr(portfolio_router, "portfolio_store", store)
    with TestClient(app) as test_client:
        test_client.store = store
        yield test_client


def test_empty_store_then_save_and_conflict(client):
    assert client.get("/api/portfolio").json() == {"revision": 0, "portfolio": None, "updatedAt": None}

    saved = client.put("/api/portfolio", json={"revision": 0, "portfolio": PORTFOLIO}, headers=JSON)
    assert saved.status_code == 200
    body = saved.json()
    assert body["revision"] == 1
    assert "cost" not in body["portfolio"]["assets"][0]
    assert "updatedAt" not in body["portfolio"]["assets"][0]  # optional nulls are omitted
    assert body["portfolio"]["asOf"] == PORTFOLIO["asOf"]

    stale = client.put("/api/portfolio", json={"revision": 0, "portfolio": PORTFOLIO}, headers=JSON)
    assert stale.status_code == 409
    assert client.get("/api/portfolio").json()["revision"] == 1


def test_save_keeps_fund_metadata_and_previous_file(client):
    client.put("/api/portfolio", json={"revision": 0, "portfolio": PORTFOLIO}, headers=JSON)
    older_tab = json.loads(json.dumps(PORTFOLIO))
    del older_tab["assets"][2]["group"]
    body = client.put("/api/portfolio", json={"revision": 1, "portfolio": older_tab}, headers=JSON).json()
    assert body["portfolio"]["assets"][2]["group"] == "sp500"
    assert (client.store.file.parent / "portfolio.json.previous").exists()


def test_rejects_invalid_payloads(client):
    bad_currency = json.loads(json.dumps(PORTFOLIO))
    bad_currency["assets"][2]["currency"] = "USD"
    assert client.put("/api/portfolio", json={"revision": 0, "portfolio": bad_currency}, headers=JSON).status_code == 400

    duplicate = json.loads(json.dumps(PORTFOLIO))
    duplicate["assets"][1]["id"] = "cash"
    assert client.put("/api/portfolio", json={"revision": 0, "portfolio": duplicate}, headers=JSON).status_code == 400

    no_zone = {**PORTFOLIO, "asOf": "2026-10-03T00:00:00"}
    assert client.put("/api/portfolio", json={"revision": 0, "portfolio": no_zone}, headers=JSON).status_code == 400

    negative = json.loads(json.dumps(PORTFOLIO))
    negative["assets"][0]["amount"] = -1
    assert client.put("/api/portfolio", json={"revision": 0, "portfolio": negative}, headers=JSON).status_code == 400

    as_form = client.put("/api/portfolio", content=json.dumps({"revision": 0, "portfolio": PORTFOLIO}), headers={"Content-Type": "text/plain"})
    assert as_form.status_code == 403

    cross_site = client.put("/api/portfolio", json={"revision": 0, "portfolio": PORTFOLIO}, headers={**JSON, "Sec-Fetch-Site": "cross-site"})
    assert cross_site.status_code == 403

    assert client.put("/api/portfolio", content="{", headers=JSON).status_code == 400


def test_append_snapshot(client):
    assert client.post("/api/portfolio", json={"revision": 0, "snapshot": snapshot("2026-10-03T00:00:00Z")}, headers=JSON).status_code == 409
    client.put("/api/portfolio", json={"revision": 0, "portfolio": PORTFOLIO}, headers=JSON)
    body = client.post("/api/portfolio", json={"revision": 1, "snapshot": snapshot("2026-10-03T00:00:00Z")}, headers=JSON).json()
    assert body["revision"] == 1
    assert len(body["portfolio"]["history"]) == 1


def test_legacy_investments_file_is_kept_aside(tmp_path):
    file = tmp_path / "portfolio.json"
    file.write_text(json.dumps({"investments": [{"symbol": "AAPL"}], "projects": []}), encoding="utf-8")
    store = PortfolioStore(file)
    assert store.read().portfolio is None
    from app.models.portfolio import Portfolio

    store.save(0, Portfolio.model_validate(PORTFOLIO))
    assert json.loads((tmp_path / "portfolio.legacy.json").read_text())["investments"][0]["symbol"] == "AAPL"
    assert store.read().revision == 1


def test_merge_history_keeps_latest_point_per_minute():
    points = [Snapshot.model_validate(snapshot(at)) for at in ("2026-10-03T00:00:10Z", "2026-10-03T00:00:50Z", "2026-10-03T00:01:00Z")]
    merged = merge_history(points[:1], points[1:], now=1e12)
    assert [p.at for p in merged] == ["2026-10-03T00:00:50Z", "2026-10-03T00:01:00Z"]
    future = Snapshot.model_validate(snapshot("2099-01-01T00:00:00Z"))
    assert merge_history([], [future], now=0) == []


def test_quote_and_fx_parsing_with_stale_fallback():
    service = MarketService()
    calls = []

    async def fake(url):
        calls.append(url)
        if "gold-api" in url:
            return {"price": 3110.34768, "updatedAt": "2026-10-03T00:00:00Z", "currency": "USD"}
        if "frankfurter" in url:
            return [{"base": "USD", "quote": q, "rate": r, "date": "2026-10-02"} for q, r in (("SGD", 1.28), ("CNY", 7.1), ("HKD", 7.8))]
        if "%5EGSPC" in url:
            raise MarketError("down")
        return {"chart": {"result": [{"meta": {"regularMarketPrice": 200.5, "regularMarketTime": 1790000000, "currency": "USD", "symbol": "AAPL"}}]}}

    service.fetch_json = fake

    async def scenario():
        gold = await service.quote("XAU")
        assert round(gold["price"], 3) == 100.0 and gold["currency"] == "USD"
        apple = await service.quote("AAPL")
        assert apple["price"] == 200.5 and apple["asOf"].endswith("Z")
        fx = await service.fx()
        assert fx["rates"] == {"USD": 1, "SGD": 1.28, "CNY": 7.1, "HKD": 7.8} and fx["asOf"] == "2026-10-02"
        with pytest.raises(MarketError):
            await service.quote("^GSPC")
        # Expire the cached quote, make the provider fail, expect the stale copy.
        key = "quote:AAPL"
        service._memory[key] = (service._memory[key][0], 0)

        async def failing(url):
            raise MarketError("down")

        service.fetch_json = failing
        stale = await service.quote("AAPL")
        assert stale["stale"] is True and stale["price"] == 200.5

    asyncio.run(scenario())
    assert any("query1.finance.yahoo.com" in c for c in calls)


def test_search_parsers_and_routes(client, monkeypatch):
    yahoo = {"quotes": [
        {"symbol": "AAPL", "longname": "Apple Inc.", "quoteType": "EQUITY", "exchange": "NMS"},
        {"symbol": "0700.HK", "shortname": "TENCENT", "quoteType": "EQUITY", "exchange": "HKG"},
        {"symbol": "BTC-USD", "shortname": "Bitcoin USD", "quoteType": "CRYPTOCURRENCY"},
        {"symbol": "VOD.L", "shortname": "Vodafone", "quoteType": "EQUITY", "exchange": "LSE"},
    ]}
    assert [i["symbol"] for i in parse_yahoo(yahoo, "stock")] == ["AAPL", "0700.HK"]
    assert [i["symbol"] for i in parse_yahoo(yahoo, "crypto")] == ["BTC-USD"]
    east = {"QuotationCodeTable": {"Data": [
        {"Code": "600519", "Name": "贵州茅台", "Classify": "AStock", "MktNum": "1"},
        {"Code": "00700", "Name": "腾讯控股", "Classify": "HK", "TypeUS": "3"},
    ]}}
    assert [i["symbol"] for i in parse_east_stocks(east)] == ["600519.SS", "0700.HK"]
    funds = {"Datas": [{"CODE": "006075", "NAME": "博时标普500ETF联接C", "FundBaseInfo": {}}, {"CODE": "000001", "NAME": "美元债", "FundBaseInfo": {}}]}
    assert [i["symbol"] for i in parse_funds(funds)] == ["006075"]

    search = InstrumentSearch()

    async def fake(url):
        if "eastmoney" in url:
            raise MarketError("down")
        return yahoo

    search.fetch_json = fake
    monkeypatch.setattr(portfolio_router, "instrument_search", search)
    body = client.get("/api/portfolio/search", params={"category": "stock", "q": "apple"}).json()
    assert body["partial"] is True
    assert body["items"][0]["symbol"] == "AAPL"
    assert client.get("/api/portfolio/search", params={"category": "bond", "q": "x"}).status_code == 400
    assert client.get("/api/portfolio/search", params={"category": "cash", "q": ""}).json()["items"][0]["category"] == "cash"
    assert client.get("/api/portfolio/quote", params={"symbol": "aapl"}).status_code == 400
