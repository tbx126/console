"""Exchange rate service using exchangerate-api.com"""
import httpx
from datetime import datetime, timedelta
from typing import Dict, Optional
import asyncio


class ExchangeRateService:
    """Service for fetching and caching exchange rates"""

    BASE_URL = "https://api.exchangerate-api.com/v4/latest"
    SUPPORTED_CURRENCIES = ["USD", "EUR", "CNY", "JPY", "GBP", "SGD"]
    CACHE_DURATION = timedelta(hours=1)

    def __init__(self):
        self._cache: Dict[str, dict] = {}
        self._cache_time: Optional[datetime] = None

    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid"""
        if not self._cache_time:
            return False
        return datetime.now() - self._cache_time < self.CACHE_DURATION

    async def get_rates(self, base: str = "USD") -> Dict[str, float]:
        """Get exchange rates for base currency"""
        if base not in self.SUPPORTED_CURRENCIES:
            base = "USD"

        cache_key = f"rates_{base}"
        if self._is_cache_valid() and cache_key in self._cache:
            return self._cache[cache_key]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.BASE_URL}/{base}")
                response.raise_for_status()
                data = response.json()

                rates = {
                    currency: data["rates"].get(currency, 1.0)
                    for currency in self.SUPPORTED_CURRENCIES
                }

                self._cache[cache_key] = rates
                self._cache_time = datetime.now()
                return rates

        except Exception as e:
            print(f"Error fetching exchange rates: {e}")
            # Return default rates on error
            return {c: 1.0 for c in self.SUPPORTED_CURRENCIES}

    async def convert(self, amount: float, from_currency: str, to_currency: str) -> float:
        """Convert amount between currencies"""
        if from_currency == to_currency:
            return amount

        rates = await self.get_rates(from_currency)
        rate = rates.get(to_currency, 1.0)
        return amount * rate

    def get_currency_symbol(self, currency: str) -> str:
        """Get currency symbol"""
        symbols = {
            "USD": "$",
            "EUR": "€",
            "CNY": "¥",
            "JPY": "¥",
            "GBP": "£",
            "SGD": "S$"
        }
        return symbols.get(currency, currency)


# Global instance
exchange_rate_service = ExchangeRateService()
