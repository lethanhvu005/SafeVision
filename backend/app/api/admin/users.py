from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.models.user import User
from backend.app.schemas.common import MessageResponse
from backend.app.schemas.user import AdminUserOut, UserOut, UserUpdate
from backend.app.services.audit import AuditService
from backend.app.services.user_admin_sync import sync_admin_record
from backend.app.utils.mask import mask_cccd

router = APIRouter()


@router.get('', response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        AdminUserOut(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            cccd_masked=mask_cccd(user.cccd),
            phone=user.phone,
            emergency_contact_name=user.emergency_contact_name,
            emergency_contact_phone=user.emergency_contact_phone,
            vehicle_info=user.vehicle_info,
            is_admin=user.is_admin,
            is_active=user.is_active,
            created_at=user.created_at,
        )
        for user in users
    ]


@router.get('/{user_id}', response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')
    return user


@router.put('/{user_id}', response_model=AdminUserOut)
def update_user(user_id: int, payload: UserUpdate, request: Request, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')

    old = {
        'full_name': user.full_name,
        'phone': user.phone,
        'emergency_contact_name': user.emergency_contact_name,
        'emergency_contact_phone': user.emergency_contact_phone,
        'vehicle_info': user.vehicle_info,
        'auto_send_enabled': user.auto_send_enabled,
        'is_admin': user.is_admin,
        'is_active': user.is_active,
    }

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    sync_admin_record(db, user)
    db.commit()
    db.refresh(user)
    AuditService.log(
        db,
        admin.id,
        'update',
        'user',
        str(user.id),
        new_value=payload.model_dump(exclude_unset=True),
        old_value=old,
        ip_address=request.client.host if request.client else None,
    )
    return AdminUserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        cccd_masked=mask_cccd(user.cccd),
        phone=user.phone,
        emergency_contact_name=user.emergency_contact_name,
        emergency_contact_phone=user.emergency_contact_phone,
        vehicle_info=user.vehicle_info,
        is_admin=user.is_admin,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.patch('/{user_id}/status', response_model=MessageResponse)
def update_status(user_id: int, is_active: bool, request: Request, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')
    old = {'is_active': user.is_active}
    user.is_active = is_active
    sync_admin_record(db, user)
    db.commit()
    AuditService.log(db, admin.id, 'update_status', 'user', str(user.id), new_value={'is_active': user.is_active}, old_value=old, ip_address=request.client.host if request.client else None)
    return MessageResponse(message='Đã cập nhật trạng thái người dùng')
