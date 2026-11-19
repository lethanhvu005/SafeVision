from datetime import datetime

from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str


class AuditLogOut(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: str
    created_at: datetime

    model_config = {'from_attributes': True}
