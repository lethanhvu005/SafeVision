from pydantic import BaseModel


class AdminDashboardSummary(BaseModel):
    total_users: int
    total_admins: int
    total_drowsiness_events: int
    total_sos_events: int
    email_success_rate: float
    system_error_count: int


class ChartPoint(BaseModel):
    label: str
    value: int
