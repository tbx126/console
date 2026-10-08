"""Unified in-memory cache for external lookups.

Every cached lookup goes through one named namespace with its own TTL and size
bound. A namespace coalesces concurrent misses for the same key into one fetch
(single-flight) and, when a refresh fails, can serve the last known value marked
stale instead of raising. Settings and /api/cache report and clear namespaces.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, Hashable, Optional, Tuple, Type

from app.utils.cache import AsyncSingleFlight, TTLCache


@dataclass(frozen=True)
class NamespaceSpec:
    name: str
    label: str
    ttl: float
    max_size: int
    stale_on_error: bool = True


class CacheNamespace:
    def __init__(self, spec: NamespaceSpec):
        self.spec = spec
        self._cache: TTLCache[Hashable, Any] = TTLCache(max_size=spec.max_size, default_ttl=spec.ttl)
        self._flight: AsyncSingleFlight[Hashable, Any] = AsyncSingleFlight()
        self._stale_served = 0
        self._errors = 0

    async def get_or_fetch(
        self,
        key: Hashable,
        fetcher: Callable[[], Awaitable[Any]],
        *,
        ttl: Optional[float] = None,
        retry_on: Tuple[Type[BaseException], ...] = (Exception,),
        mark_stale: Optional[Callable[[Any], Any]] = None,
        ttl_for: Optional[Callable[[Any], float]] = None,
    ) -> Any:
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        async def load() -> Any:
            try:
                value = await fetcher()
            except retry_on:
                self._errors += 1
                stale = self._cache.get_stale(key) if self.spec.stale_on_error else None
                if stale is None:
                    raise
                self._stale_served += 1
                return mark_stale(stale) if mark_stale else stale
            self._cache.set(key, value, ttl_for(value) if ttl_for else ttl)
            return value

        return await self._flight.run(key, load)

    def peek(self, key: Hashable) -> Any:
        return self._cache.get(key)

    def set(self, key: Hashable, value: Any, ttl: Optional[float] = None) -> None:
        self._cache.set(key, value, ttl)

    def clear(self) -> None:
        self._cache.clear()

    def info(self) -> Dict[str, Any]:
        return {
            "name": self.spec.name,
            "label": self.spec.label,
            "ttl_seconds": self.spec.ttl,
            **self._cache.info(),
            **self._flight.info(),
            "stale_served": self._stale_served,
            "errors": self._errors,
        }


class CacheService:
    def __init__(self):
        self._namespaces: Dict[str, CacheNamespace] = {}

    def namespace(self, spec: NamespaceSpec) -> CacheNamespace:
        existing = self._namespaces.get(spec.name)
        if existing is not None:
            return existing
        namespace = CacheNamespace(spec)
        self._namespaces[spec.name] = namespace
        return namespace

    def get(self, name: str) -> Optional[CacheNamespace]:
        return self._namespaces.get(name)

    def names(self) -> list[str]:
        return list(self._namespaces)

    def clear(self, name: Optional[str] = None) -> bool:
        if name is None:
            for namespace in self._namespaces.values():
                namespace.clear()
            return True
        namespace = self._namespaces.get(name)
        if namespace is None:
            return False
        namespace.clear()
        return True

    def info(self) -> list[Dict[str, Any]]:
        return [namespace.info() for namespace in self._namespaces.values()]


cache_service = CacheService()

MINUTE = 60
HOUR = 60 * MINUTE
DAY = 24 * HOUR

QUOTES = cache_service.namespace(NamespaceSpec("quote", "行情报价", 5 * MINUTE, 500))
FX = cache_service.namespace(NamespaceSpec("fx", "汇率", DAY, 8))
SEARCH = cache_service.namespace(NamespaceSpec("search", "标的搜索", MINUTE, 200, stale_on_error=False))
FLIGHT_LOOKUP = cache_service.namespace(NamespaceSpec("flight", "航班查询", 7 * DAY, 500, stale_on_error=False))
