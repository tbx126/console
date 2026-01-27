import json
import shutil
from pathlib import Path
from datetime import datetime, date
from typing import Any, Dict
from app.config import settings


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
        self._ensure_directories()

    def _ensure_directories(self):
        """Ensure data and backup directories exist"""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if settings.backup_enabled:
            self.backup_dir.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, filename: str) -> Path:
        """Get full path for a data file"""
        return self.data_dir / filename

    def read_data(self, filename: str) -> Dict[str, Any]:
        """Read data from JSON file"""
        file_path = self._get_file_path(filename)

        if not file_path.exists():
            return {}

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
        except Exception as e:
            raise Exception(f"Error reading {filename}: {str(e)}")

    def write_data(self, filename: str, data: Dict[str, Any], create_backup: bool = True):
        """Write data to JSON file with atomic write"""
        file_path = self._get_file_path(filename)

        # Create backup if file exists and backup is enabled
        if create_backup and file_path.exists() and settings.backup_enabled:
            self._create_backup(filename)

        # Atomic write: write to temp file, then rename
        temp_path = file_path.with_suffix('.tmp')
        try:
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, cls=DateTimeEncoder)

            # Rename temp file to actual file (atomic on most systems)
            temp_path.replace(file_path)
        except Exception as e:
            if temp_path.exists():
                temp_path.unlink()
            raise Exception(f"Error writing {filename}: {str(e)}")

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
