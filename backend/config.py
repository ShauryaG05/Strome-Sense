from pathlib import Path
from pydantic_settings import BaseSettings

ENV_FILE = Path(__file__).resolve().parent / ".env"

class Settings(BaseSettings):
    openweather_api_key: str = "YOUR_OPENWEATHER_API_KEY"
    gemini_api_key: str = "YOUR_GEMINI_API_KEY"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = str(ENV_FILE)
        extra = "ignore"

settings = Settings()

