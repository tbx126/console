"""Revisioned JSON store for the shared portfolio.

Every device reads and writes the same file. Writes carry the revision they
were based on; a stale revision raises RevisionConflict so one device cannot
silently overwrite another. Writes are atomic and keep the previous file as
``<name>.previous``.
"""
import json
import math
import os
import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Iterable, List, Optional

from app.config import settings
from app.models.portfolio import Portfolio, SharedPortfolio, Snapshot, dump_shared

MAX_HISTORY = 2000


class RevisionConflict(Exception):
    """The client saved against an outdated revision."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _timestamp(value: str) -> float:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return math.nan


def merge_history(existing: Iterable[Snapshot], incoming: Iterable[Snapshot], now: Optional[float] = None) -> List[Snapshot]:
    """Keep the latest observation per minute, drop future points, cap the size."""
    limit = (now if now is not None else datetime.now(timezone.utc).timestamp()) + 60
    points = sorted([*existing, *incoming], key=lambda p: _timestamp(p.at))
    minutes: dict[int, Snapshot] = {}
    for point in points:
        time = _timestamp(point.at)
        if math.isfinite(time) and time <= limit:
            minutes[math.floor(time / 60)] = point
    return sorted(minutes.values(), key=lambda p: _timestamp(p.at))[-MAX_HISTORY:]


class PortfolioStore:
    def __init__(self, file: Path):
        self.file = Path(file)
        self._lock = Lock()

    def read(self) -> SharedPortfolio:
        try:
            raw = json.loads(self.file.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return SharedPortfolio(revision=0, portfolio=None, updatedAt=None)
        if isinstance(raw, dict) and "revision" not in raw:
            # Pre-folio investments file: treat as empty and keep it aside on first save.
            return SharedPortfolio(revision=0, portfolio=None, updatedAt=None)
        return SharedPortfolio.model_validate(raw)

    def _write(self, data: SharedPortfolio) -> SharedPortfolio:
        self.file.parent.mkdir(parents=True, exist_ok=True)
        if self.file.exists():
            try:
                legacy = json.loads(self.file.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                legacy = None
            legacy_copy = self.file.with_name(f"{self.file.stem}.legacy.json")
            if isinstance(legacy, dict) and "revision" not in legacy and not legacy_copy.exists():
                shutil.copy2(self.file, legacy_copy)
        fd, temp = tempfile.mkstemp(prefix=f".{self.file.name}.{uuid.uuid4().hex}.", suffix=".tmp", dir=self.file.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(dump_shared(data), handle, ensure_ascii=False)
            os.chmod(temp, 0o600)
            if self.file.exists():
                shutil.copy2(self.file, self.file.with_name(f"{self.file.name}.previous"))
            os.replace(temp, self.file)
        finally:
            if os.path.exists(temp):
                os.unlink(temp)
        return data

    def save(self, revision: int, portfolio: Portfolio) -> SharedPortfolio:
        with self._lock:
            current = self.read()
            if revision != current.revision:
                raise RevisionConflict()
            previous_assets = {a.id: a for a in current.portfolio.assets} if current.portfolio else {}
            assets = []
            for asset in portfolio.assets:
                old = previous_assets.get(asset.id)
                # Older open tabs may omit newer fund metadata; keep what was stored.
                if asset.category == "fund" and old is not None and old.category == "fund":
                    asset = asset.model_copy(update={
                        "group": asset.group if asset.group is not None else old.group,
                        "dca": asset.dca if asset.dca is not None else old.dca,
                    })
                assets.append(asset)
            previous_history = (current.portfolio.history or []) if current.portfolio else []
            history = merge_history(previous_history, portfolio.history or [])
            saved = portfolio.model_copy(update={"assets": assets, "history": history})
            return self._write(SharedPortfolio(revision=revision + 1, portfolio=saved, updatedAt=_now()))

    def append(self, revision: int, snapshot: Snapshot) -> SharedPortfolio:
        with self._lock:
            current = self.read()
            if current.portfolio is None or revision != current.revision:
                raise RevisionConflict()
            existing = current.portfolio.history or []
            history = merge_history(existing, [snapshot])
            if [p.model_dump() for p in history] == [p.model_dump() for p in existing]:
                return current
            portfolio = current.portfolio.model_copy(update={"history": history})
            return self._write(current.model_copy(update={"portfolio": portfolio, "updatedAt": _now()}))


portfolio_store = PortfolioStore(settings.data_dir / settings.portfolio_data_file)
