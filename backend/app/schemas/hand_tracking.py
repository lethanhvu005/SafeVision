from pydantic import BaseModel, Field


class HandLandmarkOut(BaseModel):
    hand_index: int = Field(ge=0)
    landmark_id: int = Field(ge=0, le=20)
    x: float
    y: float
    z: float
    pixel_x: int = Field(ge=0)
    pixel_y: int = Field(ge=0)


class HandednessOut(BaseModel):
    hand_index: int = Field(ge=0)
    label: str
    score: float = Field(ge=0.0, le=1.0)


class HandTrackingResponse(BaseModel):
    camera_available: bool = True
    hand_count: int = Field(default=0, ge=0)
    landmarks: list[HandLandmarkOut] = Field(default_factory=list)
    handedness: list[HandednessOut] = Field(default_factory=list)
