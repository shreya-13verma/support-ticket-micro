from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class FeedbackCreate(BaseModel):
    is_helpful: bool
    comment: Optional[str] = Field(None, max_length=1000)


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    user_id: Optional[int] = None
    is_helpful: bool
    comment: Optional[str] = None
    created_at: datetime


class FeedbackStatsResponse(BaseModel):
    document_id: int
    helpful_count: int
    not_helpful_count: int
    total_feedbacks: int
    helpful_ratio: float
