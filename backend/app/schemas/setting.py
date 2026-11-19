from datetime import datetime

from pydantic import BaseModel


class SettingUpdate(BaseModel):
    ear_threshold: float | None = None
    mar_threshold: float | None = None
    head_pose_threshold: float | None = None
    eye_closed_frames_threshold: int | None = None
    yawn_frames_threshold: int | None = None
    head_nod_frames_threshold: int | None = None
    sos_hold_seconds: int | None = None
    sound_enabled: bool | None = None
    auto_send_enabled: bool | None = None
    email_retry_limit: int | None = None


class SettingOut(BaseModel):
    id: int
    user_id: int | None = None
    scope: str
    version: int
    ear_threshold: float
    mar_threshold: float
    head_pose_threshold: float
    eye_closed_frames_threshold: int
    yawn_frames_threshold: int
    head_nod_frames_threshold: int
    sos_hold_seconds: int
    sound_enabled: bool
    auto_send_enabled: bool
    email_retry_limit: int
    updated_at: datetime

    model_config = {'from_attributes': True}
