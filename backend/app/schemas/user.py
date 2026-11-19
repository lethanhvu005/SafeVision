from datetime import datetime
import re

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    cccd: str = Field(min_length=9, max_length=20)
    phone: str
    emergency_contact_name: str
    emergency_contact_phone: str
    vehicle_info: str | None = None
    avatar_url: str | None = None
    auto_send_enabled: bool = False
    is_admin: bool = False

    @field_validator('cccd', 'phone', 'emergency_contact_phone')
    @classmethod
    def validate_numeric_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.fullmatch(r'[0-9+]{6,20}', cleaned):
            raise ValueError('Chỉ được chứa chữ số hoặc dấu +')
        return cleaned


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return validate_password_strength_value(value)


def validate_password_strength_value(value: str) -> str:
    if not re.search(r'[A-Z]', value):
        raise ValueError('Mật khẩu phải có ít nhất 1 chữ hoa')
    if not re.search(r'[a-z]', value):
        raise ValueError('Mật khẩu phải có ít nhất 1 chữ thường')
    if not re.search(r'[0-9]', value):
        raise ValueError('Mật khẩu phải có ít nhất 1 chữ số')
    if not re.search(r'[^A-Za-z0-9]', value):
        raise ValueError('Mật khẩu phải có ít nhất 1 ký tự đặc biệt')
    return value


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_new_password: str = Field(min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return validate_password_strength_value(value)

    @model_validator(mode='after')
    def validate_password_confirmation(self) -> 'PasswordChangeRequest':
        if self.new_password != self.confirm_new_password:
            raise ValueError('Xác nhận mật khẩu mới không khớp')
        if self.current_password == self.new_password:
            raise ValueError('Mật khẩu mới phải khác mật khẩu hiện tại')
        return self


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    vehicle_info: str | None = None
    avatar_url: str | None = None
    auto_send_enabled: bool | None = None
    is_admin: bool | None = None
    is_active: bool | None = None

    @field_validator('phone', 'emergency_contact_phone')
    @classmethod
    def validate_optional_numeric_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return UserBase.validate_numeric_text(value)


class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class AdminUserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    cccd_masked: str
    phone: str
    emergency_contact_name: str
    emergency_contact_phone: str
    vehicle_info: str | None = None
    is_admin: bool
    is_active: bool
    created_at: datetime


class UserProfileOut(UserOut):
    pass
