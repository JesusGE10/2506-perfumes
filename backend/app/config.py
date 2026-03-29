"""
Application settings loaded from environment variables.

Uses Pydantic BaseSettings to validate and type-check all configuration
at startup, failing fast if required variables are missing.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the backend application."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Database ---
    DATABASE_URL: str

    # --- JWT Authentication ---
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 480

    # --- Cloudflare R2 (S3-compatible) ---
    R2_ENDPOINT_URL: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "perfumeria-media"
    R2_PUBLIC_URL: str = ""

    # --- n8n Webhooks ---
    N8N_WEBHOOK_BASE_URL: str = "http://localhost:5678/webhook"

    # --- OpenAI ---
    OPENAI_API_KEY: str = ""

    # --- Telegram Notifications ---
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    ADMIN_BASE_URL: str = "http://localhost:3000"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
