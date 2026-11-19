from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import decode_token
from backend.app.models.admin import Admin
from backend.app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/v1/auth/login')
DbSession = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


def get_current_user(db: DbSession, token: TokenDep) -> User:
    payload = decode_token(token)
    if payload.get('role') != 'user':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Token người dùng không hợp lệ')
    user = db.query(User).filter(User.id == int(payload['sub']), User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Không tìm thấy người dùng hoặc tài khoản đã bị khóa')
    if int(payload.get('sv', 0)) != user.session_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Phiên đăng nhập đã hết hiệu lực do tài khoản đăng nhập ở thiết bị khác')
    return user


def get_current_admin(db: DbSession, token: TokenDep) -> Admin:
    payload = decode_token(token)
    if payload.get('role') not in {'admin', 'super_admin'}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Token quản trị không hợp lệ')
    admin = db.query(Admin).filter(Admin.id == int(payload['sub']), Admin.is_active.is_(True)).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Không tìm thấy quản trị viên hoặc tài khoản đã bị khóa')
    if int(payload.get('sv', 0)) != admin.session_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Phiên quản trị đã hết hiệu lực do tài khoản đăng nhập ở thiết bị khác')
    return admin


def require_super_admin(admin: Annotated[Admin, Depends(get_current_admin)]) -> Admin:
    if admin.role != 'super_admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Yêu cầu quyền super admin')
    return admin
