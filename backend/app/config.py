"""All app settings in one place.

Values come from environment variables, or from backend/.env when running locally. 
Pydantic checks them when the app starts: a missing required setting stops the app 
right away with a clear error.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env, found from this file's location (backend/app/config.py),
# so it works no matter which folder a command is run from.
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    # extra="ignore": other variables in .env don't cause an error
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # Required (no default). Read from DATABASE_URL: names match 
    # regardless of upper/lower case.
    database_url: str

    # Comma-separated list of sites allowed to call the API.
    # e.g. "http://localhost:5173,https://zenith.vercel.app"
    frontend_origins: str = "http://localhost:5173"

    # How much the app logs: DEBUG, INFO, WARNING, or ERROR
    log_level: str = "INFO"

    @property
    def frontend_origin_list(self) -> list[str]:
        """frontend_origins split into a list, with spaces and blanks removed."""
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


# One shared copy for the whole app: from app.config import settings
settings = Settings()

