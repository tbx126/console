import json
import shutil
import tempfile
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from datetime import datetime, date
from threading import RLock
from time import monotonic
from typing import Any, Callable, Dict, TypeVar
from app.config import settings


T = TypeVar("T")


@dataclass
class _FileCacheEntry:
    signature: tuple[int, int]
    data: Dict[str, Any]
    next_validation_at: float


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder for datetime objects"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)


class DataManager:
    """Manages JSON file operations with atomic writes and backups"""

    def __init__(self):
        self.data_dir = settings.data_dir
        self.backup_dir = settings.backup_dir
        self._cache: Dict[str, _FileCacheEntry] = {}
        self._locks: Dict[str, RLock] = {}
        self._locks_guard = RLock()
        self._metrics_lock = RLock()
        self._cache_hits = 0
        self._cache_misses = 0
        self._writes = 0
        self._ensure_directories()

    def _ensure_directories(self):
        """Ensure data and backup directories exist"""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if settings.backup_enabled:
            self.backup_dir.mkdir(parents=True, exist_ok=True)
        settings.archive_dir.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, filename: str) -> Path:
        """Get full path for a data file"""
        return self.data_dir / filename

    def _get_lock(self, filename: str) -> RLock:
        with self._locks_guard:
            return self._locks.setdefault(filename, RLock())

    @staticmethod
    def _signature(file_path: Path) -> tuple[int, int]:
        stat = file_path.stat()
        return stat.st_mtime_ns, stat.st_size

    def _record_hit(self) -> None:
        with self._metrics_lock:
            self._cache_hits += 1

    def _record_miss(self) -> None:
        with self._metrics_lock:
            self._cache_misses += 1

    def _read_locked(
        self, filename: str, file_path: Path, *, mutable: bool = False
    ) -> Dict[str, Any]:
        cached = self._cache.get(filename)
        now = monotonic()
        if cached is not None and now < cached.next_validation_at:
            self._record_hit()
            return deepcopy(cached.data) if mutable else cached.data

        try:
            signature = self._signature(file_path)
        except FileNotFoundError:
            self._cache.pop(filename, None)
            self._record_miss()
            return {}

        if cached is not None and cached.signature == signature:
            cached.next_validation_at = now + settings.data_cache_validation_seconds
            self._record_hit()
            return deepcopy(cached.data) if mutable else cached.data

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError:
            data = {}

        self._cache[filename] = _FileCacheEntry(
            signature=signature,
            data=data,
            next_validation_at=now + settings.data_cache_validation_seconds,
        )
        self._record_miss()
        return deepcopy(data) if mutable else data

    def read_data(self, filename: str, *, mutable: bool = False) -> Dict[str, Any]:
        """Read cached JSON; request a private copy only for legacy write paths."""
        file_path = self._get_file_path(filename)

        with self._get_lock(filename):
            try:
                return self._read_locked(filename, file_path, mutable=mutable)
            except Exception as e:
                raise Exception(f"Error reading {filename}: {str(e)}")

    def write_data(self, filename: str, data: Dict[str, Any], create_backup: bool = True):
        """Write data to JSON file with atomic write"""
        file_path = self._get_file_path(filename)

        with self._get_lock(filename):
            self._write_locked(
                filename, file_path, data, create_backup, copy_for_cache=True
            )

    def _write_locked(
        self,
        filename: str,
        file_path: Path,
        data: Dict[str, Any],
        create_backup: bool,
        copy_for_cache: bool,
    ) -> None:
        """Write while the caller holds the per-file lock."""

        # Create backup if file exists and backup is enabled
        if create_backup and file_path.exists() and settings.backup_enabled:
            self._create_backup(filename)

        # Use a unique temp file so independent processes cannot collide.
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode='w',
                encoding='utf-8',
                dir=file_path.parent,
                prefix=f'.{file_path.name}.',
                suffix='.tmp',
                delete=False,
            ) as f:
                temp_path = Path(f.name)
                json.dump(data, f, indent=2, ensure_ascii=False, cls=DateTimeEncoder)

            temp_path.replace(file_path)
            signature = self._signature(file_path)
            self._cache[filename] = _FileCacheEntry(
                signature=signature,
                data=deepcopy(data) if copy_for_cache else data,
                next_validation_at=monotonic() + settings.data_cache_validation_seconds,
            )
            with self._metrics_lock:
                self._writes += 1
        except Exception as e:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink()
            raise Exception(f"Error writing {filename}: {str(e)}")

    def update_data(
        self,
        filename: str,
        updater: Callable[[Dict[str, Any]], T],
        create_backup: bool = True,
        write_if: Callable[[T], bool] | None = None,
    ) -> T:
        """Atomically read, mutate and persist one data file."""
        file_path = self._get_file_path(filename)
        with self._get_lock(filename):
            data = self._read_locked(filename, file_path, mutable=True)
            result = updater(data)
            if write_if is None or write_if(result):
                self._write_locked(
                    filename,
                    file_path,
                    data,
                    create_backup,
                    copy_for_cache=False,
                )
            return result

    def invalidate(self, filename: str | None = None) -> None:
        """Invalidate parsed data after an out-of-band file operation."""
        if filename is None:
            self._cache.clear()
        else:
            self._cache.pop(filename, None)

    def cache_info(self) -> dict:
        with self._metrics_lock:
            total = self._cache_hits + self._cache_misses
            return {
                "entries": len(self._cache),
                "hits": self._cache_hits,
                "misses": self._cache_misses,
                "hit_rate": self._cache_hits / total if total else 0.0,
                "writes": self._writes,
            }

    def _create_backup(self, filename: str):
        """Create a backup of the data file"""
        file_path = self._get_file_path(filename)
        if not file_path.exists():
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"{file_path.stem}_{timestamp}.json"
        backup_path = self.backup_dir / backup_filename

        try:
            shutil.copy2(file_path, backup_path)
            self._cleanup_old_backups(file_path.stem)
        except Exception as e:
            print(f"Warning: Failed to create backup: {str(e)}")

    def _cleanup_old_backups(self, file_stem: str):
        """Remove old backups beyond max_backups limit"""
        backups = sorted(
            self.backup_dir.glob(f"{file_stem}_*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )

        for backup in backups[settings.max_backups:]:
            try:
                backup.unlink()
            except Exception:
                pass

    def initialize_file(self, filename: str, default_data: Dict[str, Any]):
        """Initialize a data file with default structure if it doesn't exist"""
        file_path = self._get_file_path(filename)
        if not file_path.exists():
            self.write_data(filename, default_data, create_backup=False)


# Global instance
data_manager = DataManager()
