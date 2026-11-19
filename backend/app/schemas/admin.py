from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AdminOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    last_login_at: datetime | None = None

    model_config = {'from_attributes': True}


class AdminCreate(BaseModel):
    username: str = Field(min_length=3)
    full_name: str
    email: EmailStr
    password: str = Field(min_length=8)
    role: str = 'admin'
