from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    is_internal: bool = False


class SLAComplianceReport(BaseModel):
    total_tickets: int
    breached_tickets: int
    compliant_tickets: int
    compliance_rate_percentage: float


class AgentPerformanceMetric(BaseModel):
    agent_id: int
    assigned_count: int
    resolved_count: int
    avg_resolution_hours: float


class AgentPerformanceReport(BaseModel):
    metrics: List[AgentPerformanceMetric]
