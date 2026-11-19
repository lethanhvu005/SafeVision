from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.schemas.setting import SettingOut, SettingUpdate
from backend.app.services.audit import AuditService
from backend.app.services.settings_service import SettingsService

router = APIRouter()


@router.get('', response_model=SettingOut)
def get_settings(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return SettingsService.get_system_settings(db)


@router.put('', response_model=SettingOut)
def update_settings(payload: SettingUpdate, request: Request, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    setting = SettingsService.get_system_settings(db)
    old = {field: getattr(setting, field) for field in payload.model_fields}
    updated = SettingsService.update_settings(db, setting, payload)
    AuditService.log(db, admin.id, 'update', 'settings', str(setting.id), new_value=payload.model_dump(exclude_unset=True), old_value=old, ip_address=request.client.host if request.client else None)
    return updated
