"""Data management models for backup and archive features"""
from pydantic import BaseModel
from typing import List, Optional, Dict


class BackupInfo(BaseModel):
    filename: str
    module: str
    timestamp: str
    size_bytes: int
    is_orphan: bool = False


class ModuleBackupSummary(BaseModel):
    module: str
    count: int
    total_size_bytes: int
    latest_timestamp: Optional[str] = None


class BackupOverview(BaseModel):
    modules: List[ModuleBackupSummary]
    orphan_modules: List[ModuleBackupSummary]
    total_backups: int
    total_size_bytes: int


class ArchiveInfo(BaseModel):
    id: str
    filename: str
    created_at: str
    description: str = ""
    modules: List[str] = []
    total_size_bytes: int = 0


class CreateArchiveRequest(BaseModel):
    description: str = ""


class RestoreConfirmation(BaseModel):
    message: str
    restored_modules: List[str] = []
    backup_created: bool = False
