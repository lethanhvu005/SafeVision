from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.core.security import get_password_hash, verify_password
from backend.app.models.user import User
from backend.app.schemas.common import MessageResponse
from backend.app.schemas.setting import SettingOut, SettingUpdate
from backend.app.schemas.user import PasswordChangeRequest, UserOut, UserUpdate
from backend.app.services.settings_service import SettingsService
from backend.app.services.user_admin_sync import sync_admin_record

router = APIRouter()


@router.get('/me', response_model=UserOut)
def get_profile(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@router.put('/me', response_model=UserOut)
def update_profile(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    sync_admin_record(db, current_user, sync_password_hash=False)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put('/password', response_model=MessageResponse)
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail='Mật khẩu hiện tại không đúng')

    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.session_version += 1
    sync_admin_record(db, current_user, sync_password_hash=True, bump_session_version=True)
    db.add(current_user)
    db.commit()
    return MessageResponse(message='Đổi mật khẩu thành công. Vui lòng đăng nhập lại.')


@router.get('/settings', response_model=SettingOut)
def get_my_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return SettingsService.get_or_create_user_settings(db, current_user.id)


@router.put('/settings', response_model=SettingOut)
def update_my_settings(payload: SettingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    setting = SettingsService.get_or_create_user_settings(db, current_user.id)
    return SettingsService.update_settings(db, setting, payload)
