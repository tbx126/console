"""Exchange-rate service with bounded caching and request coalescing."""

import asyncio
from datetime import timedelta
from typing import Dict

from app.services.http_client import http_client
from app.utils.cache import AsyncSingleFlight, TTLCache


class ExchangeRateService:
    FRANKFURTER_URL = "https://api.frankfurter.app/latest"
    CACHE_DURATION = timedelta(hours=6)
    FALLBACK_CACHE_DURATION = timedelta(minutes=5)
    SUPPORTED_CURRENCIES = ["USD", "CNY", "SGD", "EUR", "GBP", "JPY", "HKD"]
    FALLBACK_RATES = {
        "USD": 7.2,
        "SGD": 5.3,
        "EUR": 7.8,
        "GBP": 9.1,
        "JPY": 0.048,
        "HKD": 0.92,
    }

    def __init__(self):
        self._rate_cache: TTLCache[str, float] = TTLCache(
            max_size=64,
            default_ttl=self.CACHE_DURATION.total_seconds(),
        )
        self._requests: AsyncSingleFlight[str, float] = AsyncSingleFlight()

    async def get_rate_to_cny(self, from_currency: str) -> float:
        """Get one currency's CNY rate, using stale data if the API is unavailable."""
        currency = from_currency.upper()
        if currency == "CNY":
            return 1.0

        cached = self._rate_cache.get(currency)
        if cached is not None:
            return cached

        async def fetch() -> float:
            # Another caller may have populated the cache before this task started.
            cached_after_wait = self._rate_cache.get(currency)
            if cached_after_wait is not None:
                return cached_after_wait

            try:
                client = await http_client.get()
                response = await client.get(
                    self.FRANKFURTER_URL,
                    params={"from": currency, "to": "CNY"},
                    timeout=10.0,
                )
                response.raise_for_status()
                rate = response.json().get("rates", {}).get("CNY")
                if rate is not None:
                    value = float(rate)
                    self._rate_cache.set(currency, value)
                    return value
            except Exception as error:
                print(f"Error fetching exchange rate {currency} to CNY: {error}")

            stale = self._rate_cache.get_stale(currency)
            if stale is not None:
                return stale

            fallback = self.FALLBACK_RATES.get(currency, 1.0)
            self._rate_cache.set(
                currency,
                fallback,
                ttl=self.FALLBACK_CACHE_DURATION.total_seconds(),
            )
            return fallback

        return await self._requests.run(currency, fetch)

    async def get_rates(self, base: str = "USD") -> Dict[str, float]:
        """Fetch each distinct rate once and calculate the requested cross rates."""
        normalized_base = base.upper()
        if normalized_base not in self.SUPPORTED_CURRENCIES:
            normalized_base = "USD"

        currencies = [
            currency for currency in self.SUPPORTED_CURRENCIES if currency != "CNY"
        ]
        values = await asyncio.gather(
            *(self.get_rate_to_cny(currency) for currency in currencies)
        )
        cny_rates = dict(zip(currencies, values))
        cny_rates["CNY"] = 1.0
        base_to_cny = cny_rates[normalized_base]

        return {
            currency: (
                1.0 if currency == normalized_base else base_to_cny / cny_rates[currency]
            )
            for currency in self.SUPPORTED_CURRENCIES
        }

    def cache_info(self) -> Dict:
        return {
            "rates": self._rate_cache.info(),
            "requests": self._requests.info(),
        }


exchange_rate_service = ExchangeRateService()
