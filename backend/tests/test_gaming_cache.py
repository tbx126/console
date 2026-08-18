import os
import time

from app.config import settings
from app.services import gaming_cache_service as cache_module


def make_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(cache_module, "CACHE_BASE", tmp_path / "gaming_cache")
    monkeypatch.setattr(settings, "gaming_cache_memory_entries", 8)
    monkeypatch.setattr(settings, "gaming_cache_max_size_mb", 1)
    return cache_module.GamingCacheService()


def test_json_cache_uses_memory_and_atomic_disk_format(tmp_path, monkeypatch):
    cache = make_cache(tmp_path, monkeypatch)
    cache.save_details(42, {"name": "Example", "screenshots": []})

    assert cache.get_cached_details(42)["name"] == "Example"
    assert cache.get_cached_details(42)["name"] == "Example"
    assert cache.cache_info()["json_memory"]["hits"] >= 2

    raw = (cache.details_dir / "42.json").read_text(encoding="utf-8")
    assert "\n" not in raw


def test_media_pruning_removes_oldest_files_until_below_target(tmp_path, monkeypatch):
    cache = make_cache(tmp_path, monkeypatch)
    old_file = cache.news_dir / "1" / "old.jpg"
    new_file = cache.news_dir / "1" / "new.jpg"
    old_file.parent.mkdir(parents=True, exist_ok=True)
    old_file.write_bytes(b"a" * 700_000)
    new_file.write_bytes(b"b" * 700_000)
    old_time = time.time() - 100
    os.utime(old_file, (old_time, old_time))

    result = cache.prune_media_cache()

    assert result["deleted_files"] == 1
    assert not old_file.exists()
    assert new_file.exists()
    assert result["total_bytes"] <= result["max_bytes"]
