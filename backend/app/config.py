from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""

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

    class Config:
        env_file = ".env"


settings = Settings()
