"""Service for backup and archive management"""
import json
import re
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.config import settings
from app.services.data_manager import data_manager, DateTimeEncoder
from app.models.data_management import (
    BackupInfo, ModuleBackupSummary, BackupOverview,
    ArchiveInfo, RestoreConfirmation,
)

TIMESTAMP_PATTERN = re.compile(r'^(.+)_(\d{8}_\d{6})\.json$')


class DataManagementService:

    def __init__(self):
        self.backup_dir = settings.backup_dir
        self.archive_dir = settings.archive_dir
        self.data_dir = settings.data_dir
        self.active_modules = set(settings.data_modules)

    # ── Snapshot helpers ──

    def _parse_backup_filename(self, filename: str):
        """Extract module name and timestamp from backup filename."""
        m = TIMESTAMP_PATTERN.match(filename)
        if not m:
            return None, None
        return m.group(1), m.group(2)

    def _format_timestamp(self, raw: str) -> str:
        """Convert '20260201_004045' → '2026-02-01T00:40:45'."""
        try:
            dt = datetime.strptime(raw, "%Y%m%d_%H%M%S")
            return dt.isoformat()
        except ValueError:
            return raw

    # ── Snapshot API ──

    def get_backup_overview(self) -> BackupOverview:
        module_map: dict[str, list] = {}
        for p in self.backup_dir.glob("*.json"):
            module, ts = self._parse_backup_filename(p.name)
            if module is None:
                continue
            module_map.setdefault(module, []).append(p)

        modules = []
        orphans = []
        total_backups = 0
        total_size = 0

        for module, files in sorted(module_map.items()):
            count = len(files)
            size = sum(f.stat().st_size for f in files)
            latest_ts = None
            if files:
                newest = max(files, key=lambda f: f.stat().st_mtime)
                _, raw_ts = self._parse_backup_filename(newest.name)
                if raw_ts:
                    latest_ts = self._format_timestamp(raw_ts)

            summary = ModuleBackupSummary(
                module=module, count=count,
                total_size_bytes=size, latest_timestamp=latest_ts,
            )
            if module in self.active_modules:
                modules.append(summary)
            else:
                orphans.append(summary)
            total_backups += count
            total_size += size

        return BackupOverview(
            modules=modules, orphan_modules=orphans,
            total_backups=total_backups, total_size_bytes=total_size,
        )

    def list_module_backups(self, module: str) -> List[BackupInfo]:
        is_orphan = module not in self.active_modules
        backups = []
        for p in sorted(
            self.backup_dir.glob(f"{module}_*.json"),
            key=lambda f: f.stat().st_mtime,
            reverse=True,
        ):
            _, raw_ts = self._parse_backup_filename(p.name)
            if raw_ts is None:
                continue
            backups.append(BackupInfo(
                filename=p.name,
                module=module,
                timestamp=self._format_timestamp(raw_ts),
                size_bytes=p.stat().st_size,
                is_orphan=is_orphan,
            ))
        return backups

    def restore_backup(self, backup_filename: str) -> RestoreConfirmation:
        backup_path = self.backup_dir / backup_filename
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup not found: {backup_filename}")

        module, _ = self._parse_backup_filename(backup_filename)
        if module is None:
            raise ValueError(f"Invalid backup filename: {backup_filename}")

        target_file = f"{module}.json"
        target_path = self.data_dir / target_file

        # Safety backup of current data before restoring
        backup_created = False
        if target_path.exists():
            data_manager._create_backup(target_file)
            backup_created = True

        shutil.copy2(backup_path, target_path)
        data_manager.invalidate(target_file)

        return RestoreConfirmation(
            message=f"Restored {module} from {backup_filename}",
            restored_modules=[module],
            backup_created=backup_created,
        )

    def delete_backup(self, backup_filename: str):
        backup_path = self.backup_dir / backup_filename
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup not found: {backup_filename}")
        # Validate filename pattern to prevent path traversal
        if '/' in backup_filename or '\\' in backup_filename or '..' in backup_filename:
            raise ValueError("Invalid filename")
        backup_path.unlink()

    def delete_orphan_backups(self) -> dict:
        deleted = []
        for p in self.backup_dir.glob("*.json"):
            module, _ = self._parse_backup_filename(p.name)
            if module is not None and module not in self.active_modules:
                p.unlink()
                deleted.append(p.name)
        # Collect unique module names
        modules = list({self._parse_backup_filename(f)[0] for f in deleted if self._parse_backup_filename(f)[0]})
        return {"deleted_count": len(deleted), "modules": modules}

    # ── Archive API ──

    def create_archive(self, description: str = "") -> ArchiveInfo:
        archive_id = str(uuid.uuid4())[:8]
        now = datetime.now()

        data = {}
        file_sizes = {}
        modules_included = []
        for module in settings.data_modules:
            filename = f"{module}.json"
            file_path = self.data_dir / filename
            if file_path.exists():
                module_data = data_manager.read_data(filename)
                data[module] = module_data
                file_sizes[module] = file_path.stat().st_size
                modules_included.append(module)

        manifest = {
            "id": archive_id,
            "created_at": now.isoformat(),
            "description": description,
            "modules": modules_included,
            "file_sizes": file_sizes,
            "total_size_bytes": sum(file_sizes.values()),
            "app_version": settings.app_version,
        }

        archive_content = {"manifest": manifest, "data": data}
        archive_filename = f"{archive_id}.json"
        archive_path = self.archive_dir / archive_filename

        with open(archive_path, 'w', encoding='utf-8') as f:
            json.dump(archive_content, f, indent=2, ensure_ascii=False, cls=DateTimeEncoder)

        return ArchiveInfo(
            id=archive_id,
            filename=archive_filename,
            created_at=now.isoformat(),
            description=description,
            modules=modules_included,
            total_size_bytes=archive_path.stat().st_size,
        )

    def list_archives(self) -> List[ArchiveInfo]:
        archives = []
        for p in sorted(
            self.archive_dir.glob("*.json"),
            key=lambda f: f.stat().st_mtime,
            reverse=True,
        ):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                m = content.get("manifest", {})
                archives.append(ArchiveInfo(
                    id=m.get("id", p.stem),
                    filename=p.name,
                    created_at=m.get("created_at", ""),
                    description=m.get("description", ""),
                    modules=m.get("modules", []),
                    total_size_bytes=p.stat().st_size,
                ))
            except (json.JSONDecodeError, Exception):
                continue
        return archives

    def get_archive_data(self, archive_id: str) -> bytes:
        archive_path = self.archive_dir / f"{archive_id}.json"
        if not archive_path.exists():
            raise FileNotFoundError(f"Archive not found: {archive_id}")
        return archive_path.read_bytes()

    def restore_archive(self, archive_id: str) -> RestoreConfirmation:
        archive_path = self.archive_dir / f"{archive_id}.json"
        if not archive_path.exists():
            raise FileNotFoundError(f"Archive not found: {archive_id}")

        with open(archive_path, 'r', encoding='utf-8') as f:
            content = json.load(f)

        if "manifest" not in content or "data" not in content:
            raise ValueError("Invalid archive format")

        restored = []
        # Create safety backups first
        for module in content["data"]:
            target = f"{module}.json"
            if (self.data_dir / target).exists():
                data_manager._create_backup(target)

        # Then write all data
        for module, module_data in content["data"].items():
            data_manager.write_data(f"{module}.json", module_data, create_backup=False)
            restored.append(module)

        return RestoreConfirmation(
            message=f"Restored {len(restored)} modules from archive {archive_id}",
            restored_modules=restored,
            backup_created=True,
        )

    def delete_archive(self, archive_id: str):
        archive_path = self.archive_dir / f"{archive_id}.json"
        if not archive_path.exists():
            raise FileNotFoundError(f"Archive not found: {archive_id}")
        archive_path.unlink()

    def import_archive(self, file_content: bytes) -> ArchiveInfo:
        try:
            content = json.loads(file_content.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise ValueError(f"Invalid JSON file: {e}")

        if "manifest" not in content or "data" not in content:
            raise ValueError("Invalid archive format: missing 'manifest' or 'data'")

        manifest = content["manifest"]
        # Generate new ID to avoid collisions
        archive_id = str(uuid.uuid4())[:8]
        manifest["id"] = archive_id

        archive_filename = f"{archive_id}.json"
        archive_path = self.archive_dir / archive_filename

        content["manifest"] = manifest
        with open(archive_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)

        return ArchiveInfo(
            id=archive_id,
            filename=archive_filename,
            created_at=manifest.get("created_at", ""),
            description=manifest.get("description", ""),
            modules=manifest.get("modules", []),
            total_size_bytes=archive_path.stat().st_size,
        )


data_management_service = DataManagementService()
