from functools import lru_cache
from pathlib import Path
import secrets

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = 'Driver Safety AI Platform'
    app_env: str = 'development'
    api_v1_prefix: str = '/api/v1'
    secret_key: str = 'change-this-secret-key'
    access_token_expire_minutes: int = 120
    algorithm: str = 'HS256'
    database_url: str = 'sqlite:///./storage/db/driversafe.db'
    smtp_host: str = 'smtp.gmail.com'
    smtp_port: int = 587
    smtp_username: str = ''
    smtp_password: str = ''
    smtp_from: str = 'noreply@example.com'
    smtp_use_tls: bool = True
    default_agency_email: str = 'default-agency@example.com'
    storage_path: str = 'storage'
    sos_model_path: str = 'bestSOS.pt'
    log_level: str = 'INFO'
    frontend_origin: str = 'http://localhost:5173'

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    @field_validator('storage_path')
    @classmethod
    def ensure_storage_path(cls, value: str) -> str:
        Path(value).mkdir(parents=True, exist_ok=True)
        Path(value, 'evidence').mkdir(parents=True, exist_ok=True)
        Path(value, 'logs').mkdir(parents=True, exist_ok=True)
        Path(value, 'db').mkdir(parents=True, exist_ok=True)
        return value

    @field_validator('secret_key')
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if value == 'change-this-secret-key':
            raise ValueError(
                'SECRET_KEY mặc định không an toàn. Hãy đặt SECRET_KEY ngẫu nhiên dài tối thiểu 32 ký tự trong file .env'
            )
        if len(value) < 32:
            raise ValueError('SECRET_KEY quá ngắn. Hãy dùng chuỗi ngẫu nhiên dài tối thiểu 32 ký tự')
        return value

    @staticmethod
    def generate_secret_key() -> str:
        return secrets.token_urlsafe(48)


@lru_cache
def get_settings() -> Settings:
    return Settings()
