from sqlalchemy import func
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.models.admin import Admin
from backend.app.models.drowsiness_event import DrowsinessEvent
from backend.app.models.email_log import EmailLog
from backend.app.models.sos_event import SosEvent
from backend.app.models.system_log import SystemLog
from backend.app.models.user import User
from backend.app.schemas.dashboard import AdminDashboardSummary, ChartPoint

router = APIRouter()


@router.get('/summary', response_model=AdminDashboardSummary)
def summary(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_admins = db.query(func.count(Admin.id)).scalar() or 0
    total_drowsiness_events = db.query(func.count(DrowsinessEvent.id)).scalar() or 0
    total_sos_events = db.query(func.count(SosEvent.id)).scalar() or 0
    total_email = db.query(func.count(EmailLog.id)).scalar() or 0
    sent_email = db.query(func.count(EmailLog.id)).filter(EmailLog.status == 'sent').scalar() or 0
    errors = db.query(func.count(SystemLog.id)).filter(SystemLog.log_level.in_(['ERROR', 'CRITICAL'])).scalar() or 0
    return AdminDashboardSummary(
        total_users=total_users,
        total_admins=total_admins,
        total_drowsiness_events=total_drowsiness_events,
        total_sos_events=total_sos_events,
        email_success_rate=(sent_email / total_email * 100.0) if total_email else 0.0,
        system_error_count=errors,
    )


@router.get('/charts')
def charts(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    drowsiness_levels = db.query(DrowsinessEvent.drowsiness_level, func.count(DrowsinessEvent.id)).group_by(DrowsinessEvent.drowsiness_level).all()
    return {
        'drowsiness_levels': [ChartPoint(label=f'Level {level}', value=count).model_dump() for level, count in drowsiness_levels],
        'sos_status': [
            {'label': status, 'value': count}
            for status, count in db.query(SosEvent.status, func.count(SosEvent.id)).group_by(SosEvent.status).all()
        ],
    }
