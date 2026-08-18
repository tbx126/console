from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(env_file=".env")

    # App settings
    app_name: str = "Personal Life Console"
    app_version: str = "1.0.0"
    debug: bool = True

    # CORS settings
    cors_origins: list = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

    # Data paths
    data_dir: Path = Path(__file__).parent.parent / "data"
    travel_data_file: str = "travel.json"
    portfolio_data_file: str = "portfolio.json"
    finance_data_file: str = "finance.json"
    gaming_data_file: str = "gaming.json"
    config_data_file: str = "config.json"

    # Backup settings
    backup_enabled: bool = True
    backup_dir: Path = Path(__file__).parent.parent / "data" / "backups"
    max_backups: int = 30

    # Cache settings
    data_cache_validation_seconds: float = 1.0
    gaming_cache_memory_entries: int = 512
    gaming_cache_download_concurrency: int = 8
    gaming_cache_game_concurrency: int = 2
    gaming_cache_max_asset_mb: int = 16
    gaming_cache_max_size_mb: int = 1024
    gaming_cache_prune_interval_seconds: int = 300

    # Archive settings
    archive_dir: Path = Path(__file__).parent.parent / "data" / "archives"
    data_modules: list = ["finance", "travel", "portfolio", "gaming", "config"]

settings = Settings()
