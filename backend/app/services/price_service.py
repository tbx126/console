"""Price service for stocks and cryptocurrencies"""
import httpx
from datetime import datetime, timedelta
from typing import Dict, Optional


class PriceService:
    """Service for fetching real-time asset prices"""

    # API endpoints
    ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"
    COINGECKO_URL = "https://api.coingecko.com/api/v3"

    # Cache durations
    STOCK_CACHE_DURATION = timedelta(minutes=15)
    CRYPTO_CACHE_DURATION = timedelta(minutes=5)

    def __init__(self):
        self._stock_cache: Dict[str, dict] = {}
        self._crypto_cache: Dict[str, dict] = {}

    def _get_alpha_vantage_key(self) -> str:
        """Get Alpha Vantage API key from config"""
        try:
            from app.services.data_manager import data_manager
            from app.config import settings
            data = data_manager.read_data(settings.config_data_file)
            return data.get("api_keys", {}).get("alpha_vantage_key") or "demo"
        except:
            return "demo"

    async def get_stock_price(self, symbol: str) -> Optional[dict]:
        """Get stock price from Alpha Vantage"""
        symbol = symbol.upper()
        cache_key = symbol

        # Check cache
        if cache_key in self._stock_cache:
            cached = self._stock_cache[cache_key]
            if datetime.now() - cached["time"] < self.STOCK_CACHE_DURATION:
                return cached["data"]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                params = {
                    "function": "GLOBAL_QUOTE",
                    "symbol": symbol,
                    "apikey": self._get_alpha_vantage_key()
                }
                response = await client.get(self.ALPHA_VANTAGE_URL, params=params)
                response.raise_for_status()
                data = response.json()

                quote = data.get("Global Quote", {})
                if not quote:
                    return None

                result = {
                    "symbol": symbol,
                    "price": float(quote.get("05. price", 0)),
                    "change": float(quote.get("09. change", 0)),
                    "change_percent": quote.get("10. change percent", "0%"),
                    "updated_at": datetime.now().isoformat()
                }

                self._stock_cache[cache_key] = {"data": result, "time": datetime.now()}
                return result

        except Exception as e:
            print(f"Error fetching stock price for {symbol}: {e}")
            return None

    async def get_crypto_price(self, symbol: str) -> Optional[dict]:
        """Get cryptocurrency price from CoinGecko"""
        symbol = symbol.lower()
        cache_key = symbol

        # Check cache
        if cache_key in self._crypto_cache:
            cached = self._crypto_cache[cache_key]
            if datetime.now() - cached["time"] < self.CRYPTO_CACHE_DURATION:
                return cached["data"]

        # Map common symbols to CoinGecko IDs
        symbol_map = {
            "btc": "bitcoin",
            "eth": "ethereum",
            "usdt": "tether",
            "bnb": "binancecoin",
            "xrp": "ripple",
            "ada": "cardano",
            "doge": "dogecoin",
            "sol": "solana"
        }
        coin_id = symbol_map.get(symbol, symbol)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{self.COINGECKO_URL}/simple/price"
                params = {
                    "ids": coin_id,
                    "vs_currencies": "usd",
                    "include_24hr_change": "true"
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                if coin_id not in data:
                    return None

                coin_data = data[coin_id]
                result = {
                    "symbol": symbol.upper(),
                    "price": coin_data.get("usd", 0),
                    "change_percent_24h": coin_data.get("usd_24h_change", 0),
                    "updated_at": datetime.now().isoformat()
                }

                self._crypto_cache[cache_key] = {"data": result, "time": datetime.now()}
                return result

        except Exception as e:
            print(f"Error fetching crypto price for {symbol}: {e}")
            return None

    async def get_price(self, symbol: str, asset_type: str) -> Optional[dict]:
        """Get price based on asset type"""
        if asset_type == "crypto":
            return await self.get_crypto_price(symbol)
        elif asset_type == "stock":
            return await self.get_stock_price(symbol)
        return None


# Global instance
price_service = PriceService()
