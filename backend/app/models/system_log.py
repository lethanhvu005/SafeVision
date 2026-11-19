from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class SystemLog(Base):
    __tablename__ = 'system_logs'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    service_name: Mapped[str] = mapped_column(String(50), nullable=False)
    log_level: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    stack_trace: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
