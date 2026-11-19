from pydantic import BaseModel, Field


class AiInferRequest(BaseModel):
    frame_data_url: str = Field(min_length=100, max_length=3_000_000)


class SosBBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class AiStateResponse(BaseModel):
    ear: float
    mar: float
    head_pitch: float
    drowsiness_level: int
    reason: str
    sos_score: float
    sos_triggered: bool
    camera_available: bool = True
    face_detected: bool = False
    sos_label: str = 'unavailable'
    sos_stable_seconds: float = 0.0
    sos_bbox: SosBBox | None = None
    sos_source: str = 'none'
    mediapipe_sos_label: str = 'unavailable'
    mediapipe_sos_score: float = 0.0
    mediapipe_sos_stable_seconds: float = 0.0
    mediapipe_sos_bbox: SosBBox | None = None
    mediapipe_sos_stage: int = 0
    mediapipe_sos_triggered: bool = False
    model_sos_label: str = 'unavailable'
    model_sos_score: float = 0.0
    model_sos_stable_seconds: float = 0.0
    model_sos_bbox: SosBBox | None = None
