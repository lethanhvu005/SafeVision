from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.mixins import TimestampMixin


class Setting(TimestampMixin, Base):
    __tablename__ = 'settings'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    scope: Mapped[str] = mapped_column(String(30), default='system', nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    ear_threshold: Mapped[float] = mapped_column(Float, default=0.21, nullable=False)
    mar_threshold: Mapped[float] = mapped_column(Float, default=0.6, nullable=False)
    head_pose_threshold: Mapped[float] = mapped_column(Float, default=15.0, nullable=False)
    eye_closed_frames_threshold: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    yawn_frames_threshold: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    head_nod_frames_threshold: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    sos_hold_seconds: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_send_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_retry_limit: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    user = relationship('User', back_populates='settings')
