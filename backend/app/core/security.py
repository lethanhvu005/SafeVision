from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

from backend.app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=['argon2', 'bcrypt'], deprecated='auto')

TOKEN_ISSUER = 'driversafe-backend'
TOKEN_AUDIENCE = 'driversafe-frontend'


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except UnknownHashError:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, role: str, session_version: int, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload: dict[str, Any] = {
        'sub': subject,
        'role': role,
        'sv': session_version,
        'iat': now,
        'nbf': now,
        'exp': expire,
        'iss': TOKEN_ISSUER,
        'aud': TOKEN_AUDIENCE,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            issuer=TOKEN_ISSUER,
            audience=TOKEN_AUDIENCE,
            options={'require_sub': True, 'require_exp': True, 'require_iat': True, 'require_nbf': True},
        )
    except JWTError as exc:
        raise ValueError('Token không hợp lệ') from exc
