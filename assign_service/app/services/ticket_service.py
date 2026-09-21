from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.models.ticket import Ticket
from app.models.entities import AuditLog, SLAPolicy
from app.schemas.ticket import TicketCreate, TicketAssignRequest, TicketStatusRequest
from app.services.user_client import user_client

VALID_TRANSITIONS = {
    "open": ["in_progress", "on_hold", "closed"],
    "in_progress": ["on_hold", "resolved", "closed", "open"],
    "on_hold": ["in_progress", "resolved", "closed", "open"],
    "resolved": ["closed", "in_progress"],
    "closed": []  # Terminal state
}


class TicketService:
    @staticmethod
    async def create_ticket(ticket_in: TicketCreate, user_claims: Dict[str, Any], db: AsyncSession) -> Ticket:
        user_id = user_claims["id"]

        # Calculate SLA due date if policy exists
        due_date = None
        policy_res = await db.execute(select(SLAPolicy).where(SLAPolicy.priority == ticket_in.priority))
        policy = policy_res.scalar_one_or_none()
        if policy:
            due_date = datetime.now(timezone.utc) + timedelta(hours=int(str(policy.resolution_time_hours)))
        else:
            default_hours = {"urgent": 4, "high": 12, "medium": 24, "low": 48}.get(ticket_in.priority, 24)
            due_date = datetime.now(timezone.utc) + timedelta(hours=default_hours)

        ticket = Ticket(
            title=ticket_in.title,
            description=ticket_in.description,
            category=ticket_in.category,
            priority=ticket_in.priority,
            status="open",
            created_by=user_id,
            due_at=due_date,
            sla_breached=False
        )
        db.add(ticket)
        await db.flush()

        # Create audit log
        audit = AuditLog(
            ticket_id=ticket.id,
            actor_id=user_id,
            action="CREATE_TICKET",
            new_value=f"status=open, priority={ticket.priority}"
        )
        db.add(audit)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def list_tickets(user_claims: Dict[str, Any], db: AsyncSession) -> List[Ticket]:
        role = user_claims.get("role", "user")
        user_id = user_claims["id"]

        if role == "admin":
            query = select(Ticket).order_by(Ticket.created_at.desc())
        elif role == "agent":
            # Agent sees assigned tickets + open unassigned tickets
            query = select(Ticket).where(
                or_(Ticket.assigned_to == user_id, Ticket.assigned_to.is_(None))
            ).order_by(Ticket.created_at.desc())
        else:
            # User sees only their own tickets
            query = select(Ticket).where(Ticket.created_by == user_id).order_by(Ticket.created_at.desc())

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_ticket(ticket_id: int, user_claims: Dict[str, Any], db: AsyncSession) -> Ticket:
        query = select(Ticket).where(Ticket.id == ticket_id)
        result = await db.execute(query)
        ticket = result.scalar_one_or_none()
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        role = user_claims.get("role", "user")
        user_id = user_claims["id"]
        ticket_creator = int(str(ticket.created_by))

        if role == "user" and ticket_creator != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

        return ticket

    @staticmethod
    async def assign_ticket(ticket_id: int, assign_in: TicketAssignRequest, user_claims: Dict[str, Any], db: AsyncSession) -> Ticket:
        ticket = await TicketService.get_ticket(ticket_id, user_claims, db)

        # Confirm agent exists and has active agent/admin role in user_service
        agent_info = await user_client.get_user(assign_in.agent_id)
        if not agent_info:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent does not exist")
        if agent_info.get("role") not in ["agent", "admin"] or not agent_info.get("is_active"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not an active agent or admin")

        ticket_obj: Any = ticket
        old_assignee = str(ticket.assigned_to) if ticket.assigned_to is not None else "None"
        ticket_obj.assigned_to = assign_in.agent_id
        if str(ticket.status) == "open":
            ticket_obj.status = "in_progress"

        audit = AuditLog(
            ticket_id=ticket.id,
            actor_id=user_claims["id"],
            action="ASSIGN_TICKET",
            old_value=old_assignee,
            new_value=str(assign_in.agent_id)
        )
        db.add(audit)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def update_status(ticket_id: int, status_in: TicketStatusRequest, user_claims: Dict[str, Any], db: AsyncSession) -> Ticket:
        ticket = await TicketService.get_ticket(ticket_id, user_claims, db)
        current_status = str(ticket.status)
        new_status = status_in.status

        if new_status == current_status:
            return ticket

        allowed = VALID_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transition from '{current_status}' to '{new_status}'"
            )

        ticket_obj: Any = ticket
        ticket_obj.status = new_status
        if new_status == "resolved" and ticket.resolved_at is None:
            ticket_obj.resolved_at = datetime.now(timezone.utc)

        audit = AuditLog(
            ticket_id=ticket.id,
            actor_id=user_claims["id"],
            action="UPDATE_STATUS",
            old_value=current_status,
            new_value=new_status
        )
        db.add(audit)
        await db.commit()
        await db.refresh(ticket)
        return ticket
