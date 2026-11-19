from datetime import datetime

from pydantic import BaseModel


class DrowsinessEventCreate(BaseModel):
    ear_value: float
    mar_value: float
    head_value: float
    drowsiness_level: int
    alert_triggered: bool
    evidence_path: str | None = None
    meta_json: str | None = None


class DrowsinessEventOut(BaseModel):
    id: int
    user_id: int
    event_time: datetime
    ear_value: float
    mar_value: float
    head_value: float
    drowsiness_level: int
    alert_triggered: bool
    evidence_path: str | None = None
    meta_json: str | None = None

    model_config = {'from_attributes': True}


class SosTriggerRequest(BaseModel):
    trigger_type: str
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    note: str | None = None
    evidence_path: str | None = None
    evidence_data_url: str | None = None


class SosConfirmRequest(BaseModel):
    sos_id: int
    confirmed: bool
    cancel_reason: str | None = None


class SosEventOut(BaseModel):
    id: int
    user_id: int
    agency_id: int | None
    trigger_type: str
    status: str
    event_time: datetime
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    maps_url: str | None = None
    evidence_path: str | None = None
    email_status: str
    note: str | None = None
    cancel_reason: str | None = None

    model_config = {'from_attributes': True}


class EmailLogOut(BaseModel):
    id: int
    sos_id: int | None = None
    recipient_email: str
    subject: str
    body_preview: str
    status: str
    retry_count: int
    error_message: str | None = None
    sent_at: datetime | None = None
    created_at: datetime

    model_config = {'from_attributes': True}
