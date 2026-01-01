from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App settings
    app_name: str = "Poker Scraper API"
    debug: bool = False

    # Browser settings
    browser_headless: bool = True
    browser_timeout: int = 30000  # milliseconds

    # Scraping settings
    scrape_delay_min: float = 1.0  # seconds
    scrape_delay_max: float = 3.0  # seconds
    max_retries: int = 3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
