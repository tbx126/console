"""Portfolio (folio) data models.

Mirrors the zod schemas in frontend/src/features/portfolio/lib/portfolio.ts.
Only current holdings and market values are stored; no cost basis or P&L.
"""
from datetime import datetime
from typing import Annotated, List, Literal, Optional, Union

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator

Currency = Literal["SGD", "USD", "CNY", "HKD"]
Category = Literal["cash", "stock", "fund", "gold", "crypto"]
CURRENCIES: tuple[str, ...] = ("SGD", "USD", "CNY", "HKD")
CATEGORIES: tuple[str, ...] = ("cash", "stock", "fund", "gold", "crypto")

SECURITY_SYMBOL = r"^[A-Z0-9][A-Z0-9.^=-]{0,23}$"

Finite = Annotated[float, Field(strict=True, ge=0, le=1e15, allow_inf_nan=False)]
Name = Annotated[str, StringConstraints(min_length=1, max_length=80)]
SecuritySymbol = Annotated[str, StringConstraints(pattern=SECURITY_SYMBOL)]
# A subset of SECURITY_SYMBOL: USD-quoted pairs only.
CryptoSymbol = Annotated[str, StringConstraints(pattern=r"^[A-Z0-9]{1,20}-USD$")]


def _check_iso_datetime(value: str) -> str:
    """ISO 8601 date-time that carries a time zone (Z or ±hh:mm), kept verbatim."""
    if not isinstance(value, str) or "T" not in value:
        raise ValueError("must be an ISO 8601 date-time")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("must be an ISO 8601 date-time") from error
    if parsed.tzinfo is None:
        raise ValueError("date-time must include a time zone")
    return value


IsoDateTime = Annotated[str, Field(strict=True)]


class _Model(BaseModel):
    """Unknown fields are dropped, matching the client-side schema."""

    model_config = {"extra": "ignore"}


class _AssetBase(_Model):
    id: Name
    name: Name
    updatedAt: Optional[IsoDateTime] = None

    @field_validator("updatedAt")
    @classmethod
    def _updated_at(cls, value: Optional[str]) -> Optional[str]:
        return None if value is None else _check_iso_datetime(value)


class CashAsset(_AssetBase):
    category: Literal["cash"]
    currency: Currency
    amount: Finite


class StockAsset(_AssetBase):
    category: Literal["stock"]
    currency: Currency
    symbol: SecuritySymbol
    quantity: Finite


class DcaPlan(_Model):
    enabled: Annotated[bool, Field(strict=True)]
    amount: Finite
    frequency: Literal["weekday", "weekly", "monthly"]


class FundAsset(_AssetBase):
    category: Literal["fund"]
    currency: Literal["CNY"]
    quantity: Finite
    marketValue: Finite
    symbol: Optional[Annotated[str, StringConstraints(max_length=24)]] = None
    group: Optional[Literal["sp500", "nasdaq100", "other"]] = None
    dca: Optional[DcaPlan] = None


class GoldAsset(_AssetBase):
    category: Literal["gold"]
    quantity: Finite


class CryptoAsset(_AssetBase):
    category: Literal["crypto"]
    currency: Literal["USD"]
    symbol: CryptoSymbol
    quantity: Finite


Asset = Annotated[
    Union[CashAsset, StockAsset, FundAsset, GoldAsset, CryptoAsset],
    Field(discriminator="category"),
]


class Totals(_Model):
    SGD: Finite
    USD: Finite
    CNY: Finite
    HKD: Finite


class CategoryTotals(_Model):
    """Per-category value in SGD at the time of the snapshot."""

    cash: Finite
    stock: Finite
    fund: Finite
    gold: Finite
    crypto: Finite


class Snapshot(_Model):
    at: IsoDateTime
    totals: Totals
    cached: Annotated[bool, Field(strict=True)]
    categories: Optional[CategoryTotals] = None

    @field_validator("at")
    @classmethod
    def _at(cls, value: str) -> str:
        return _check_iso_datetime(value)


class Portfolio(_Model):
    version: Literal[1]
    asOf: IsoDateTime
    assets: Annotated[List[Asset], Field(max_length=200)]
    history: Optional[Annotated[List[Snapshot], Field(max_length=2000)]] = None

    @field_validator("asOf")
    @classmethod
    def _as_of(cls, value: str) -> str:
        return _check_iso_datetime(value)

    @model_validator(mode="after")
    def _unique_ids(self) -> "Portfolio":
        ids = [asset.id for asset in self.assets]
        if len(set(ids)) != len(ids):
            raise ValueError("资产 id 不能重复")
        return self


Revision = Annotated[int, Field(strict=True, ge=0)]


class SharedPortfolio(_Model):
    revision: Revision
    portfolio: Optional[Portfolio] = None
    updatedAt: Optional[IsoDateTime] = None


class SavePortfolioRequest(_Model):
    revision: Revision
    portfolio: Portfolio


class AppendSnapshotRequest(_Model):
    revision: Revision
    snapshot: Snapshot


def dump_shared(shared: SharedPortfolio) -> dict:
    """Serialize without optional nulls inside the portfolio (the client rejects them)."""
    return {
        "revision": shared.revision,
        "portfolio": shared.portfolio.model_dump(exclude_none=True) if shared.portfolio else None,
        "updatedAt": shared.updatedAt,
    }
