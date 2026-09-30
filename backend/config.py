from pathlib import Path
from pydantic_settings import BaseSettings

ENV_FILE = Path(__file__).resolve().parent / ".env"

class Settings(BaseSettings):
    openweather_api_key: str = "YOUR_OPENWEATHER_API_KEY"
    gemini_api_key: str = "YOUR_GEMINI_API_KEY"
    frontend_uri: str = ""
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    def get_cors_origins(self) -> list[str]:
        origins = list(self.cors_origins)
        if self.frontend_uri and self.frontend_uri not in ("YOUR_FRONTEND_URI", ""):
            cleaned = self.frontend_uri.strip().rstrip("/")
            if cleaned and cleaned not in origins:
                origins.append(cleaned)
        return origins

    class Config:
        env_file = str(ENV_FILE)
        extra = "ignore"

settings = Settings()


