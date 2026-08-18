"""Data management API routes for backup and archive features"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from typing import List

from app.models.data_management import (
    BackupInfo, BackupOverview, ArchiveInfo,
    CreateArchiveRequest, RestoreConfirmation,
)
from app.services.data_management_service import data_management_service

router = APIRouter()


# ── Snapshot endpoints ──

@router.get("/snapshots/overview", response_model=BackupOverview)
async def get_snapshot_overview():
    """Get backup overview with per-module statistics."""
    return data_management_service.get_backup_overview()


@router.delete("/snapshots/orphans")
async def delete_orphan_snapshots():
    """Delete all orphan backups from removed modules."""
    return data_management_service.delete_orphan_backups()


@router.get("/snapshots/{module}", response_model=List[BackupInfo])
async def get_module_snapshots(module: str):
    """List all backups for a specific module."""
    return data_management_service.list_module_backups(module)


@router.post("/snapshots/{backup_filename}/restore", response_model=RestoreConfirmation)
async def restore_snapshot(backup_filename: str):
    """Restore data from a specific backup file."""
    try:
        return data_management_service.restore_backup(backup_filename)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/snapshots/{backup_filename}")
async def delete_snapshot(backup_filename: str):
    """Delete a specific backup file."""
    try:
        data_management_service.delete_backup(backup_filename)
        return {"message": f"Deleted {backup_filename}"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Archive endpoints ──
# Note: /archives/import MUST be before /archives/{archive_id} routes

@router.post("/archives/import", response_model=ArchiveInfo)
async def import_archive(file: UploadFile = File(...)):
    """Import an archive from an uploaded JSON file."""
    try:
        content = await file.read()
        return data_management_service.import_archive(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/archives", response_model=ArchiveInfo)
async def create_archive(request: CreateArchiveRequest):
    """Create a new archive of all current data."""
    return data_management_service.create_archive(request.description)


@router.get("/archives", response_model=List[ArchiveInfo])
async def list_archives():
    """List all archives."""
    return data_management_service.list_archives()


@router.get("/archives/{archive_id}/download")
async def download_archive(archive_id: str):
    """Download an archive as a JSON file."""
    try:
        data = data_management_service.get_archive_data(archive_id)
        return Response(
            content=data,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=archive_{archive_id}.json"},
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/archives/{archive_id}/restore", response_model=RestoreConfirmation)
async def restore_archive(archive_id: str):
    """Restore all data from an archive."""
    try:
        return data_management_service.restore_archive(archive_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/archives/{archive_id}")
async def delete_archive(archive_id: str):
    """Delete an archive."""
    try:
        data_management_service.delete_archive(archive_id)
        return {"message": f"Archive {archive_id} deleted"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
