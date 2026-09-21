from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any, List
from datetime import datetime
from app.database import get_db
from app.models.ticket import Ticket
from app.schemas.comments_and_reports import SLAComplianceReport, AgentPerformanceReport, AgentPerformanceMetric
from app.utils.auth_deps import require_role

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/sla-compliance", response_model=SLAComplianceReport)
async def get_sla_compliance_report(
    db: AsyncSession = Depends(get_db),
    _admin_or_agent: Dict[str, Any] = Depends(require_role(["admin", "agent"]))
):
    total_res = await db.execute(select(func.count(Ticket.id)))
    total_tickets = total_res.scalar() or 0

    breached_res = await db.execute(select(func.count(Ticket.id)).where(Ticket.sla_breached.is_(True)))
    breached_tickets = breached_res.scalar() or 0

    compliant_tickets = total_tickets - breached_tickets
    compliance_rate = (compliant_tickets / total_tickets * 100.0) if total_tickets > 0 else 100.0

    return {
        "total_tickets": total_tickets,
        "breached_tickets": breached_tickets,
        "compliant_tickets": compliant_tickets,
        "compliance_rate_percentage": round(compliance_rate, 2)
    }


@router.get("/agent-performance", response_model=AgentPerformanceReport)
async def get_agent_performance_report(
    db: AsyncSession = Depends(get_db),
    _admin_or_agent: Dict[str, Any] = Depends(require_role(["admin", "agent"]))
):
    # Fetch all assigned tickets
    query = select(Ticket).where(Ticket.assigned_to.isnot(None))
    result = await db.execute(query)
    tickets = result.scalars().all()

    agent_data: Dict[int, Dict[str, Any]] = {}

    for t in tickets:
        agent_id = int(str(t.assigned_to))
        if agent_id not in agent_data:
            agent_data[agent_id] = {"assigned": 0, "resolved": 0, "resolution_seconds_total": 0.0}

        agent_data[agent_id]["assigned"] += 1
        if str(t.status) in ["resolved", "closed"] and t.resolved_at is not None and t.created_at is not None:
            agent_data[agent_id]["resolved"] += 1
            created_dt = t.created_at if isinstance(t.created_at, datetime) else datetime.fromisoformat(str(t.created_at))
            resolved_dt = t.resolved_at if isinstance(t.resolved_at, datetime) else datetime.fromisoformat(str(t.resolved_at))
            duration = (resolved_dt - created_dt).total_seconds()
            agent_data[agent_id]["resolution_seconds_total"] += duration

    metrics: List[AgentPerformanceMetric] = []
    for agent_id, stats in agent_data.items():
        avg_hours = (stats["resolution_seconds_total"] / max(stats["resolved"], 1)) / 3600.0
        metrics.append(AgentPerformanceMetric(
            agent_id=agent_id,
            assigned_count=stats["assigned"],
            resolved_count=stats["resolved"],
            avg_resolution_hours=round(avg_hours, 2)
        ))

    return {"metrics": metrics}
