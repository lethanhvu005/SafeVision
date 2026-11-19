from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.core.rate_limit import build_rate_limit_key, rate_limiter
from backend.app.core.security import create_access_token, verify_password
from backend.app.models.admin import Admin
from backend.app.schemas.admin import AdminOut
from backend.app.schemas.auth import AdminLoginRequest, TokenResponse

router = APIRouter()


@router.post('/login', response_model=TokenResponse)
def admin_login(payload: AdminLoginRequest, request: Request, db: Session = Depends(get_db)):
    rate_limiter.enforce(build_rate_limit_key('admin_login', request, payload.email.lower()), limit=10, window_seconds=300)
    admin = db.query(Admin).filter(Admin.email == payload.email, Admin.is_active.is_(True)).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Sai tài khoản quản trị hoặc mật khẩu')
    admin.session_version += 1
    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(admin)
    return TokenResponse(access_token=create_access_token(str(admin.id), admin.role, admin.session_version), role=admin.role)


@router.get('/profile', response_model=AdminOut)
def admin_profile(current_admin: Admin = Depends(get_current_admin)):
    return current_admin
