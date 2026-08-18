import asyncio
import time

from app.utils.cache import AsyncSingleFlight, TTLCache


def test_ttl_cache_is_bounded_and_supports_stale_values():
    cache = TTLCache(max_size=2, default_ttl=0.01)
    cache.set("a", 1)
    cache.set("b", 2)
    assert cache.get("a") == 1

    cache.set("c", 3)
    assert cache.get_stale("b") is None
    assert cache.get("c") == 3

    time.sleep(0.02)
    assert cache.get("a") is None
    assert cache.get_stale("a") == 1
    assert cache.info()["evictions"] == 1


def test_singleflight_coalesces_concurrent_calls():
    async def scenario():
        singleflight = AsyncSingleFlight()
        calls = 0

        async def work():
            nonlocal calls
            calls += 1
            await asyncio.sleep(0.01)
            return "result"

        results = await asyncio.gather(
            *(singleflight.run("same-key", work) for _ in range(20))
        )
        assert results == ["result"] * 20
        assert calls == 1
        assert singleflight.info()["in_flight"] == 0

    asyncio.run(scenario())
