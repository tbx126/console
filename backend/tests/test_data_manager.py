import json
import os
from concurrent.futures import ThreadPoolExecutor

from app.config import settings
from app.services.data_manager import DataManager


def make_manager(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    monkeypatch.setattr(settings, "data_dir", data_dir)
    monkeypatch.setattr(settings, "backup_dir", data_dir / "backups")
    monkeypatch.setattr(settings, "archive_dir", data_dir / "archives")
    monkeypatch.setattr(settings, "backup_enabled", False)
    monkeypatch.setattr(settings, "data_cache_validation_seconds", 0.0)
    return DataManager()


def test_parsed_json_cache_returns_isolated_copies_and_detects_external_changes(
    tmp_path, monkeypatch
):
    manager = make_manager(tmp_path, monkeypatch)
    manager.write_data("sample.json", {"items": [{"id": 1}]}, create_backup=False)

    first = manager.read_data("sample.json", mutable=True)
    first["items"][0]["id"] = 999
    assert manager.read_data("sample.json")["items"][0]["id"] == 1

    file_path = manager.data_dir / "sample.json"
    file_path.write_text(json.dumps({"items": [{"id": 2}]}), encoding="utf-8")
    os.utime(file_path, None)
    assert manager.read_data("sample.json")["items"][0]["id"] == 2

    info = manager.cache_info()
    assert info["hits"] >= 1
    assert info["misses"] >= 1


def test_atomic_updates_do_not_lose_concurrent_writes(tmp_path, monkeypatch):
    manager = make_manager(tmp_path, monkeypatch)
    manager.write_data("counter.json", {"value": 0}, create_backup=False)

    def increment(_):
        def mutate(data):
            data["value"] += 1

        manager.update_data("counter.json", mutate, create_backup=False)

    with ThreadPoolExecutor(max_workers=8) as executor:
        list(executor.map(increment, range(100)))

    assert manager.read_data("counter.json")["value"] == 100
