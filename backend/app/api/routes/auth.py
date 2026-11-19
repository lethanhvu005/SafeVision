from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.rate_limit import build_rate_limit_key, rate_limiter
from backend.app.core.security import create_access_token, get_password_hash, verify_password
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, TokenResponse
from backend.app.schemas.user import UserCreate, UserOut
from backend.app.services.settings_service import SettingsService

router = APIRouter()


@router.post('/register', response_model=UserOut)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)) -> User:
    rate_limiter.enforce(build_rate_limit_key('register', request, payload.email.lower()), limit=5, window_seconds=300)
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email đã tồn tại')
    if db.query(User).filter(User.cccd == payload.cccd).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='CCCD đã tồn tại')
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        cccd=payload.cccd,
        phone=payload.phone,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        vehicle_info=payload.vehicle_info,
        avatar_url=payload.avatar_url,
        auto_send_enabled=payload.auto_send_enabled,
        is_admin=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    SettingsService.get_or_create_user_settings(db, user.id)
    return user


@router.post('/login', response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    rate_limiter.enforce(build_rate_limit_key('user_login', request, payload.email.lower()), limit=10, window_seconds=300)
    user = db.query(User).filter(User.email == payload.email, User.is_active.is_(True)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Sai email hoặc mật khẩu')
    user.session_version += 1
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(str(user.id), 'user', user.session_version)
    return TokenResponse(access_token=token, role='user')
