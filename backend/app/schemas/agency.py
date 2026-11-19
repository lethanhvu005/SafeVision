from datetime import datetime

from pydantic import BaseModel, EmailStr


class AgencyBase(BaseModel):
    region_code: str
    region_name: str
    agency_name: str
    email: EmailStr
    phone: str
    lat_min: float | None = None
    lat_max: float | None = None
    lon_min: float | None = None
    lon_max: float | None = None
    polygon_geojson: str | None = None
    is_default: bool = False
    is_active: bool = True


class AgencyCreate(AgencyBase):
    pass


class AgencyUpdate(BaseModel):
    region_name: str | None = None
    agency_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    lat_min: float | None = None
    lat_max: float | None = None
    lon_min: float | None = None
    lon_max: float | None = None
    polygon_geojson: str | None = None
    is_default: bool | None = None
    is_active: bool | None = None


class AgencyOut(AgencyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}
