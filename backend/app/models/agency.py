from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.mixins import TimestampMixin


class Agency(TimestampMixin, Base):
    __tablename__ = 'agencies'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    region_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    region_name: Mapped[str] = mapped_column(String(150), nullable=False)
    agency_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    lat_min: Mapped[float | None]
    lat_max: Mapped[float | None]
    lon_min: Mapped[float | None]
    lon_max: Mapped[float | None]
    polygon_geojson: Mapped[str | None] = mapped_column(Text)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    sos_events = relationship('SosEvent', back_populates='agency')
