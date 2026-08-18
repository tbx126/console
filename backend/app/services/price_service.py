"""Asset-price service with pooled HTTP and bounded request caches."""

from datetime import datetime, timedelta
from typing import Dict, Optional

from app.services.http_client import http_client
from app.utils.cache import AsyncSingleFlight, TTLCache


class PriceService:
    ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"
    COINGECKO_URL = "https://api.coingecko.com/api/v3"
    YAHOO_FINANCE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"
    STOCK_CACHE_DURATION = timedelta(minutes=15)
    CRYPTO_CACHE_DURATION = timedelta(minutes=5)

    def __init__(self):
        self._stock_cache: TTLCache[str, dict] = TTLCache(
            max_size=256,
            default_ttl=self.STOCK_CACHE_DURATION.total_seconds(),
        )
        self._crypto_cache: TTLCache[str, dict] = TTLCache(
            max_size=256,
            default_ttl=self.CRYPTO_CACHE_DURATION.total_seconds(),
        )
        self._requests: AsyncSingleFlight[str, Optional[dict]] = AsyncSingleFlight()

    def _get_alpha_vantage_key(self) -> str:
        try:
            from app.config import settings
            from app.services.data_manager import data_manager

            data = data_manager.read_data(settings.config_data_file)
            return data.get("api_keys", {}).get("alpha_vantage_key") or "demo"
        except Exception:
            return "demo"

    async def get_stock_price_yahoo(self, symbol: str) -> Optional[dict]:
        try:
            client = await http_client.get()
            response = await client.get(
                f"{self.YAHOO_FINANCE_URL}/{symbol}",
                params={"interval": "1d", "range": "1d"},
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                timeout=10.0,
            )
            response.raise_for_status()
            results = response.json().get("chart", {}).get("result", [])
            if not results:
                return None

            meta = results[0].get("meta", {})
            current_price = meta.get("regularMarketPrice")
            previous_close = meta.get("previousClose")
            if current_price is None:
                return None
            change = current_price - previous_close if previous_close else 0
            change_percent = change / previous_close * 100 if previous_close else 0
            return {
                "symbol": symbol,
                "price": float(current_price),
                "currency": meta.get("currency", "USD"),
                "change": float(change),
                "change_percent": f"{change_percent:.2f}%",
                "updated_at": datetime.now().isoformat(),
            }
        except Exception as error:
            print(f"Error fetching Yahoo Finance price for {symbol}: {error}")
            return None

    async def get_stock_price_alpha_vantage(self, symbol: str) -> Optional[dict]:
        try:
            client = await http_client.get()
            response = await client.get(
                self.ALPHA_VANTAGE_URL,
                params={
                    "function": "GLOBAL_QUOTE",
                    "symbol": symbol,
                    "apikey": self._get_alpha_vantage_key(),
                },
                timeout=10.0,
            )
            response.raise_for_status()
            quote = response.json().get("Global Quote", {})
            if not quote:
                return None
            return {
                "symbol": symbol,
                "price": float(quote.get("05. price", 0)),
                "currency": "USD",
                "change": float(quote.get("09. change", 0)),
                "change_percent": quote.get("10. change percent", "0%"),
                "updated_at": datetime.now().isoformat(),
            }
        except Exception as error:
            print(f"Error fetching Alpha Vantage price for {symbol}: {error}")
            return None

    async def get_stock_price(self, symbol: str) -> Optional[dict]:
        normalized = symbol.upper()
        cached = self._stock_cache.get(normalized)
        if cached is not None:
            return cached

        async def fetch() -> Optional[dict]:
            cached_after_wait = self._stock_cache.get(normalized)
            if cached_after_wait is not None:
                return cached_after_wait
            result = await self.get_stock_price_yahoo(normalized)
            if result is None:
                result = await self.get_stock_price_alpha_vantage(normalized)
            if result is not None:
                self._stock_cache.set(normalized, result)
                return result
            return self._stock_cache.get_stale(normalized)

        return await self._requests.run(f"stock:{normalized}", fetch)

    async def get_crypto_price(self, symbol: str) -> Optional[dict]:
        normalized = symbol.lower()
        cached = self._crypto_cache.get(normalized)
        if cached is not None:
            return cached

        async def fetch() -> Optional[dict]:
            cached_after_wait = self._crypto_cache.get(normalized)
            if cached_after_wait is not None:
                return cached_after_wait

            symbol_map = {
                "btc": "bitcoin",
                "eth": "ethereum",
                "usdt": "tether",
                "bnb": "binancecoin",
                "xrp": "ripple",
                "ada": "cardano",
                "doge": "dogecoin",
                "sol": "solana",
            }
            coin_id = symbol_map.get(normalized, normalized)
            try:
                client = await http_client.get()
                response = await client.get(
                    f"{self.COINGECKO_URL}/simple/price",
                    params={
                        "ids": coin_id,
                        "vs_currencies": "usd",
                        "include_24hr_change": "true",
                    },
                    timeout=10.0,
                )
                response.raise_for_status()
                coin_data = response.json().get(coin_id)
                if coin_data is None:
                    return self._crypto_cache.get_stale(normalized)
                result = {
                    "symbol": normalized.upper(),
                    "price": coin_data.get("usd", 0),
                    "change_percent_24h": coin_data.get("usd_24h_change", 0),
                    "updated_at": datetime.now().isoformat(),
                }
                self._crypto_cache.set(normalized, result)
                return result
            except Exception as error:
                print(f"Error fetching crypto price for {normalized}: {error}")
                return self._crypto_cache.get_stale(normalized)

        return await self._requests.run(f"crypto:{normalized}", fetch)

    async def get_price(self, symbol: str, asset_type: str) -> Optional[dict]:
        if asset_type == "crypto":
            return await self.get_crypto_price(symbol)
        if asset_type == "stock":
            return await self.get_stock_price(symbol)
        return None

    def cache_info(self) -> Dict:
        return {
            "stocks": self._stock_cache.info(),
            "crypto": self._crypto_cache.info(),
            "requests": self._requests.info(),
        }


price_service = PriceService()
