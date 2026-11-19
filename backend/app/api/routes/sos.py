from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.email_log import EmailLog
from backend.app.models.sos_event import SosEvent
from backend.app.models.user import User
from backend.app.schemas.common import MessageResponse
from backend.app.schemas.event import EmailLogOut, SosConfirmRequest, SosEventOut, SosTriggerRequest
from backend.app.services.sos_service import SosService

router = APIRouter()
settings = get_settings()
ALLOWED_EVIDENCE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_EVIDENCE_SIZE = 5 * 1024 * 1024


@router.post('/trigger', response_model=SosEventOut)
def trigger_sos(payload: SosTriggerRequest, db: Session = Depends(get_db), current_user: Annotated[User, Depends(get_current_user)] = None):
    if not current_user.full_name or not current_user.cccd:
        raise HTTPException(status_code=400, detail='Hồ sơ người dùng chưa đủ thông tin để gửi SOS')
    return SosService.trigger(db, current_user, **payload.model_dump())


@router.post('/confirm', response_model=SosEventOut)
def confirm_sos(payload: SosConfirmRequest, db: Session = Depends(get_db), current_user: Annotated[User, Depends(get_current_user)] = None):
    sos = db.query(SosEvent).filter(SosEvent.id == payload.sos_id, SosEvent.user_id == current_user.id).first()
    if not sos:
        raise HTTPException(status_code=404, detail='Không tìm thấy sự kiện SOS')
    return SosService.confirm(db, sos, payload.confirmed, payload.cancel_reason)


@router.get('/history', response_model=list[SosEventOut])
def get_history(db: Session = Depends(get_db), current_user: Annotated[User, Depends(get_current_user)] = None):
    return db.query(SosEvent).filter(SosEvent.user_id == current_user.id).order_by(SosEvent.event_time.desc()).all()


@router.get('/email-history', response_model=list[EmailLogOut])
def get_email_history(db: Session = Depends(get_db), current_user: Annotated[User, Depends(get_current_user)] = None):
    return db.query(EmailLog).join(SosEvent, EmailLog.sos_id == SosEvent.id).filter(SosEvent.user_id == current_user.id).order_by(EmailLog.created_at.desc()).all()


@router.post('/evidence-upload', response_model=MessageResponse)
def upload_evidence(file: UploadFile = File(...), current_user: Annotated[User, Depends(get_current_user)] = None):
    if file.content_type not in ALLOWED_EVIDENCE_TYPES:
        raise HTTPException(status_code=400, detail='Chỉ cho phép ảnh JPG, PNG hoặc WEBP')

    file_bytes = file.file.read()
    if len(file_bytes) > MAX_EVIDENCE_SIZE:
        raise HTTPException(status_code=400, detail='Ảnh bằng chứng vượt quá 5MB')

    safe_name = Path(file.filename or 'evidence.jpg').name
    target = Path(settings.storage_path) / 'evidence' / f'user_{current_user.id}_{safe_name}'
    with target.open('wb') as output:
        output.write(file_bytes)
    return MessageResponse(message=str(target.as_posix()))
