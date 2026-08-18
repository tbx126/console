"""Shared outbound HTTP connection pool."""

import asyncio
from typing import Optional

import httpx


class HTTPClientManager:
    """Lazily create one pooled client for all external API services."""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._lock = asyncio.Lock()

    async def get(self) -> httpx.AsyncClient:
        client = self._client
        if client is not None and not client.is_closed:
            return client

        async with self._lock:
            client = self._client
            if client is None or client.is_closed:
                self._client = httpx.AsyncClient(
                    timeout=httpx.Timeout(30.0, connect=10.0),
                    follow_redirects=True,
                    limits=httpx.Limits(
                        max_connections=32,
                        max_keepalive_connections=16,
                        keepalive_expiry=30.0,
                    ),
                )
            return self._client

    async def close(self) -> None:
        async with self._lock:
            if self._client is not None and not self._client.is_closed:
                await self._client.aclose()
            self._client = None


http_client = HTTPClientManager()
