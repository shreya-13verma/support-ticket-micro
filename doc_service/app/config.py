from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "Ticket Raiser - Support Document Service"
    DATABASE_URL: str = "postgresql+asyncpg://doc_admin:doc_password@localhost:5435/doc_db"
    SECRET_KEY: str = "supersecretjwtkeyforbothservices12345"
    ALGORITHM: str = "HS256"
    INTERNAL_API_KEY: str = "internal_service_secret_token_xyz987"
    USER_SERVICE_URL: str = "http://localhost:8001"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
