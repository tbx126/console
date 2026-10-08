import asyncio
import json
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.services.cache_service import QUOTES, CacheNamespace, NamespaceSpec
from app.services.milestone_service import MilestoneService, portfolio_milestones, travel_milestones, gaming_milestones


def test_namespace_single_flight_stale_and_ttl_for():
    ns = CacheNamespace(NamespaceSpec("t", "t", 60, 10))
    calls = []

    async def scenario():
        async def fetch():
            calls.append(1)
            await asyncio.sleep(0.01)
            return {"v": len(calls)}

        first, second = await asyncio.gather(ns.get_or_fetch("k", fetch), ns.get_or_fetch("k", fetch))
        assert first == second == {"v": 1} and len(calls) == 1  # coalesced
        assert await ns.get_or_fetch("k", fetch) == {"v": 1}  # cached

        ns.set("k", {"v": 1}, ttl=0.001)
        await asyncio.sleep(0.01)

        async def boom():
            raise ValueError("down")

        stale = await ns.get_or_fetch("k", boom, mark_stale=lambda old: {**old, "stale": True})
        assert stale == {"v": 1, "stale": True}
        with pytest.raises(ValueError):
            await ns.get_or_fetch("missing", boom)

        async def partial():
            return {"partial": True}

        await ns.get_or_fetch("p", partial, ttl_for=lambda r: 0.001 if r["partial"] else 60)
        await asyncio.sleep(0.01)
        assert ns.peek("p") is None

    asyncio.run(scenario())
    info = ns.info()
    assert info["stale_served"] == 1 and info["errors"] == 2


def test_cache_api_lists_and_clears(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    QUOTES.set("AAPL", {"price": 1})
    with TestClient(app) as client:
        body = client.get("/api/cache").json()
        names = [n["name"] for n in body["namespaces"]]
        assert {"quote", "fx", "search", "flight"} <= set(names)
        assert "disk" in body["steam"] and "hit_rate" in body["data"]
        assert client.delete("/api/cache/quote").status_code == 200
        assert QUOTES.peek("AAPL") is None
        assert client.delete("/api/cache/nope").status_code == 404
        assert client.delete("/api/cache").status_code == 200


def snap(at, sgd):
    return {"at": at, "totals": {"SGD": sgd, "USD": sgd, "CNY": sgd, "HKD": sgd}, "cached": False}


def test_portfolio_milestones_dates_durations_and_eta():
    history = [
        snap("2026-01-01T00:00:00Z", 40_000),
        snap("2026-02-01T00:00:00Z", 55_000),
        snap("2026-06-01T00:00:00Z", 101_000),
        snap("2026-09-01T00:00:00Z", 140_000),
    ]
    items = portfolio_milestones(history)
    done = {m.id: m for m in items if m.achieved}
    assert done["portfolio-total-50000"].date == "2026-02-01"
    assert done["portfolio-total-100000"].detail == "自 S$ 50,000 起用时 120 天"
    upcoming = [m for m in items if not m.achieved]
    assert len(upcoming) == 1 and upcoming[0].target == 150_000
    assert round(upcoming[0].progress, 3) == round(140_000 / 150_000, 3)
    assert upcoming[0].eta is not None
    assert portfolio_milestones([]) == []


def test_travel_and_gaming_milestones():
    flights = [
        {"flight_number": f"SQ{i}", "date": f"2026-0{1 + i // 4}-{10 + i % 4:02d}", "origin": "SIN", "destination": f"C{i}", "distance": 5000}
        for i in range(11)
    ]
    items = travel_milestones(flights, date(2026, 10, 8))
    by_id = {m.id: m for m in items}
    assert by_id["flights-10"].achieved and by_id["flights-10"].date == "2026-03-11"
    assert by_id["flights-10"].detail == "第 10 段：SQ9"
    assert not by_id["flights-25"].achieved and by_id["flights-25"].current == 11
    assert by_id["places-10"].achieved  # SIN + 11 destinations
    assert by_id["distance-40075"].achieved
    assert by_id["year-2026-10"].achieved

    games = [{"name": "A", "playtime_forever": 6000 * 60}, *({"name": f"G{i}", "playtime_forever": 60} for i in range(30))]
    g = {m.id: m for m in gaming_milestones(games)}
    assert g["games-25"].achieved and g["games-25"].date is None
    assert not g["games-50"].achieved
    assert g["single-game-1000"].achieved and g["single-game-1000"].detail == "A"


def test_milestone_service_emoji_override(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    from app.services import data_manager as dm

    monkeypatch.setattr(dm.data_manager, "data_dir", tmp_path)
    (tmp_path / "travel.json").write_text(json.dumps({"flights": [
        {"flight_number": f"X{i}", "date": f"2026-01-{i + 1:02d}", "origin": "A", "destination": "B"} for i in range(10)
    ]}))
    service = MilestoneService()
    service.set_emoji("flights-10", "🎉")
    result = service.compute(today=date(2026, 10, 8))
    first = next(m for m in result["achieved"] if m["id"] == "flights-10")
    assert first["emoji"] == "🎉"
    assert all("progress" in m for m in result["upcoming"])
