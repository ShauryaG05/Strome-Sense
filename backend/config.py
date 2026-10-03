import os
from pathlib import Path
from pydantic_settings import BaseSettings

ENV_FILE = Path(__file__).resolve().parent / ".env"

class Settings(BaseSettings):
    openweather_api_key: str = "YOUR_OPENWEATHER_API_KEY"
    groq_api_key: str = ""
    grok_api_key: str = "YOUR_GROK_API_KEY"
    xai_api_key: str = ""
    gemini_api_key: str = ""  # Retained for legacy compatibility
    grok_model: str = "openai/gpt-oss-120b"
    grok_base_url: str = "https://api.groq.com/openai/v1"
    frontend_uri: str = ""
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    def get_ai_config(self) -> tuple[str, str, list[str]]:
        """Return (api_key, base_url, models_list) auto-detecting Groq vs xAI."""
        key = ""
        for k in (
            os.getenv("GROQ_API_KEY"),
            os.getenv("GROK_API_KEY"),
            os.getenv("XAI_API_KEY"),
            self.groq_api_key,
            self.grok_api_key,
            self.xai_api_key,
        ):
            if k and k not in ("YOUR_GROK_API_KEY", "YOUR_XAI_API_KEY", ""):
                key = k.strip()
                break

        if not key:
            return "", "https://api.groq.com/openai/v1", []

        # Detect Groq keys
        if key.startswith("gsk_"):
            base_url = os.getenv("GROQ_BASE_URL") or "https://api.groq.com/openai/v1"
            models = [
                "openai/gpt-oss-120b",
                "qwen/qwen3.8-27b",
                "openai/gpt-oss-20b",
                "allam-2-7b",
            ]
            return key, base_url, models

        # Otherwise assume xAI Grok
        base_url = os.getenv("GROK_BASE_URL") or self.grok_base_url or "https://api.x.ai/v1"
        models = [
            self.grok_model or "grok-2-latest",
            "grok-2-latest",
            "grok-2",
            "grok-beta",
        ]
        return key, base_url, models

    def get_grok_key(self) -> str:
        key, _, _ = self.get_ai_config()
        return key

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
