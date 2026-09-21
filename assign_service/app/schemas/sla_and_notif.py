from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class SLAPolicyBase(BaseModel):
    priority: str = Field(..., pattern="^(low|medium|high|urgent)$")
    response_time_hours: int = Field(..., gt=0)
    resolution_time_hours: int = Field(..., gt=0)


class SLAPolicyCreate(SLAPolicyBase):
    pass


class SLAPolicyOut(SLAPolicyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    ticket_id: Optional[int] = None
    title: str
    message: str
    is_read: bool
    created_at: datetime
