from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class TicketBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    category: str = Field(..., min_length=2, max_length=100)
    priority: str = Field(..., pattern="^(low|medium|high|urgent)$")


class TicketCreate(TicketBase):
    pass


class TicketAssignRequest(BaseModel):
    agent_id: int


class TicketStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(open|in_progress|on_hold|resolved|closed)$")


class TicketOut(TicketBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_by: int
    assigned_to: Optional[int] = None
    due_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    sla_breached: bool
    created_at: datetime
    updated_at: datetime


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    author_id: int
    author_name: str
    content: str
    is_internal: bool
    created_at: datetime


class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    uploaded_by: int
    filename: str
    file_path: str
    file_size: int
    content_type: str
    created_at: datetime


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    actor_id: int
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime


class TicketDetailOut(TicketOut):
    comments: List[CommentOut] = []
    attachments: List[AttachmentOut] = []
    audit_logs: List[AuditLogOut] = []
