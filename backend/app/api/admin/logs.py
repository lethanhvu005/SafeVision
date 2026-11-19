from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.models.audit_log import AuditLog
from backend.app.models.drowsiness_event import DrowsinessEvent
from backend.app.models.email_log import EmailLog
from backend.app.models.sos_event import SosEvent
from backend.app.models.system_log import SystemLog
from backend.app.schemas.common import AuditLogOut
from backend.app.schemas.event import DrowsinessEventOut, EmailLogOut, SosEventOut
from backend.app.services.email_service import EmailService

router = APIRouter()


@router.get('/drowsiness-events', response_model=list[DrowsinessEventOut])
def get_drowsiness_events(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return db.query(DrowsinessEvent).order_by(DrowsinessEvent.event_time.desc()).limit(100).all()


@router.get('/sos-events', response_model=list[SosEventOut])
def get_sos_events(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return db.query(SosEvent).order_by(SosEvent.event_time.desc()).limit(100).all()


@router.get('/email-logs', response_model=list[EmailLogOut])
def get_email_logs(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return db.query(EmailLog).order_by(EmailLog.created_at.desc()).limit(100).all()


@router.post('/email-logs/{log_id}/retry', response_model=EmailLogOut)
def retry_email(log_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    log = db.query(EmailLog).filter(EmailLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail='Email log not found')
    return EmailService.send_email(db, log.recipient_email, log.subject, log.body_preview, log.sos_id, retry_count=log.retry_count + 1)


@router.get('/audit-logs', response_model=list[AuditLogOut])
def get_audit_logs(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()


@router.get('/system-logs')
def get_system_logs(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    rows = db.query(SystemLog).order_by(SystemLog.created_at.desc()).limit(100).all()
    return [
        {
            'id': row.id,
            'service_name': row.service_name,
            'log_level': row.log_level,
            'message': row.message,
            'created_at': row.created_at,
        }
        for row in rows
    ]
