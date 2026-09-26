from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class TagCreate(TagBase):
    slug: Optional[str] = Field(None, max_length=60)


class TagResponse(TagBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    created_at: datetime


class TagList(BaseModel):
    tags: List[TagResponse]
    total: int
