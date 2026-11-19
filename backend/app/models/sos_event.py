from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


class SosEvent(Base):
    __tablename__ = 'sos_events'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    agency_id: Mapped[int | None] = mapped_column(ForeignKey('agencies.id', ondelete='SET NULL'), index=True)
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default='pending', nullable=False)
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    latitude: Mapped[float | None]
    longitude: Mapped[float | None]
    address: Mapped[str | None] = mapped_column(String(255))
    maps_url: Mapped[str | None] = mapped_column(String(255))
    evidence_path: Mapped[str | None] = mapped_column(String(255))
    email_status: Mapped[str] = mapped_column(String(30), default='pending', nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    cancel_reason: Mapped[str | None] = mapped_column(String(255))

    user = relationship('User', back_populates='sos_events')
    agency = relationship('Agency', back_populates='sos_events')
    email_logs = relationship('EmailLog', back_populates='sos_event')
