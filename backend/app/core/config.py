from functools import lru_cache

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseModel
    class BaseSettings(BaseModel):  # type: ignore[no-redef]
        pass
    def SettingsConfigDict(**kwargs):  # type: ignore[no-redef]
        return kwargs


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    environment: str = "development"
    database_url: str = "postgresql+psycopg://tour_cmf:change-me-before-production@db:5432/tour_cmf"
    cors_origins: str = "http://localhost:3000"
    jwt_secret_key: str = "replace-this-development-secret-before-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Optional AI LLM configuration (OpenAI / Gemini / OpenAI-compatible API)
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
