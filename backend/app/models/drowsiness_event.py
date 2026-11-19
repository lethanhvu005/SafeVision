from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


class DrowsinessEvent(Base):
    __tablename__ = 'drowsiness_events'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ear_value: Mapped[float]
    mar_value: Mapped[float]
    head_value: Mapped[float]
    drowsiness_level: Mapped[int] = mapped_column(Integer, index=True)
    alert_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    evidence_path: Mapped[str | None] = mapped_column(String(255))
    meta_json: Mapped[str | None] = mapped_column(String(2000))

    user = relationship('User', back_populates='drowsiness_events')
