from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.drowsiness_event import DrowsinessEvent
from backend.app.models.user import User
from backend.app.schemas.event import DrowsinessEventCreate, DrowsinessEventOut

router = APIRouter()


@router.post('/events', response_model=DrowsinessEventOut)
def create_event(payload: DrowsinessEventCreate, db: Session = Depends(get_db), current_user: Annotated[User, Depends(get_current_user)] = None):
    event = DrowsinessEvent(user_id=current_user.id, event_time=datetime.now(timezone.utc), **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get('/events', response_model=list[DrowsinessEventOut])
def list_events(db: Session = Depends(get_db), current_user: Annotated[User, Depends(get_current_user)] = None):
    return db.query(DrowsinessEvent).filter(DrowsinessEvent.user_id == current_user.id).order_by(DrowsinessEvent.event_time.desc()).all()
