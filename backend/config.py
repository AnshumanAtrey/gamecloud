"""Runtime configuration.

DATABASE_URL is the single seam that points the same code at SQLite (local, zero-setup)
or MySQL/MariaDB (docker-compose + the live EC2 box / RDS):
  sqlite:///./gamecloud.db
  mysql+pymysql://gamecloud:pass@mysql:3306/gamecloud
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLite by default so `python -m uvicorn main:app` just runs; overridden to MySQL in prod.
    database_url: str = "sqlite:///./gamecloud.db"

    jwt_secret: str = "dev-insecure-change-me-in-prod"
    jwt_ttl_hours: int = 12

    cors_origins: str = "*"  # comma-separated, or "*"
    company_name: str = "GameCloud"

    # demo seed password for all roles (admin/manager/ops) — change for any real deployment
    seed_password: str = "gamecloud123"


settings = Settings()
