"""Small, dependency-free cache primitives used by backend services."""

from __future__ import annotations

import asyncio
from collections import OrderedDict
from dataclasses import dataclass
from threading import RLock
from time import monotonic
from typing import Awaitable, Callable, Dict, Generic, Hashable, Optional, TypeVar


K = TypeVar("K", bound=Hashable)
V = TypeVar("V")


@dataclass
class _CacheEntry(Generic[V]):
    value: V
    expires_at: float


class TTLCache(Generic[K, V]):
    """Thread-safe, bounded LRU cache with per-entry TTLs and basic metrics."""

    def __init__(self, max_size: int, default_ttl: float):
        if max_size <= 0:
            raise ValueError("max_size must be positive")
        if default_ttl <= 0:
            raise ValueError("default_ttl must be positive")

        self.max_size = max_size
        self.default_ttl = default_ttl
        self._entries: OrderedDict[K, _CacheEntry[V]] = OrderedDict()
        self._lock = RLock()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def get(self, key: K) -> Optional[V]:
        now = monotonic()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None or entry.expires_at <= now:
                self._misses += 1
                return None
            self._entries.move_to_end(key)
            self._hits += 1
            return entry.value

    def get_stale(self, key: K) -> Optional[V]:
        """Return an entry even after expiry, for stale-if-error fallbacks."""
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            self._entries.move_to_end(key)
            return entry.value

    def set(self, key: K, value: V, ttl: Optional[float] = None) -> None:
        lifetime = self.default_ttl if ttl is None else ttl
        if lifetime <= 0:
            self.delete(key)
            return

        with self._lock:
            self._entries[key] = _CacheEntry(value=value, expires_at=monotonic() + lifetime)
            self._entries.move_to_end(key)
            while len(self._entries) > self.max_size:
                self._entries.popitem(last=False)
                self._evictions += 1

    def delete(self, key: K) -> None:
        with self._lock:
            self._entries.pop(key, None)

    def delete_where(self, predicate: Callable[[K], bool]) -> None:
        with self._lock:
            for key in [key for key in self._entries if predicate(key)]:
                self._entries.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def info(self) -> dict:
        with self._lock:
            total = self._hits + self._misses
            return {
                "size": len(self._entries),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": self._hits / total if total else 0.0,
                "evictions": self._evictions,
            }


class AsyncSingleFlight(Generic[K, V]):
    """Coalesce concurrent work for the same key into one asyncio task."""

    def __init__(self):
        self._tasks: Dict[K, asyncio.Task[V]] = {}
        self._lock = asyncio.Lock()

    async def run(self, key: K, factory: Callable[[], Awaitable[V]]) -> V:
        async with self._lock:
            task = self._tasks.get(key)
            if task is None:
                task = asyncio.create_task(factory())
                self._tasks[key] = task

        try:
            return await asyncio.shield(task)
        finally:
            if task.done():
                async with self._lock:
                    if self._tasks.get(key) is task:
                        self._tasks.pop(key, None)

    def info(self) -> dict:
        return {"in_flight": len(self._tasks)}
