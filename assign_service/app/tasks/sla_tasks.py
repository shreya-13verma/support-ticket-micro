import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select, and_
from app.tasks.celery_app import celery
from app.database import AsyncSessionLocal
from app.models.ticket import Ticket
from app.models.entities import Notification, AuditLog

logger = logging.getLogger(__name__)


async def _run_sla_check():
    async with AsyncSessionLocal() as session:
        now = datetime.now(timezone.utc)
        # Find open or in_progress tickets where due_at is in past and sla_breached is False
        query = select(Ticket).where(
            and_(
                Ticket.status.in_(["open", "in_progress", "on_hold"]),
                Ticket.due_at < now,
                Ticket.sla_breached.is_(False)
            )
        )
        result = await session.execute(query)
        breached_tickets = result.scalars().all()

        for ticket in breached_tickets:
            ticket_obj: Any = ticket
            ticket_obj.sla_breached = True
            # Create notification for creator and assignee
            recipients = {int(str(ticket.created_by))}
            if ticket.assigned_to is not None:
                recipients.add(int(str(ticket.assigned_to)))

            for uid in recipients:
                notif = Notification(
                    user_id=uid,
                    ticket_id=ticket.id,
                    title="SLA Breach Alert",
                    message=f"Ticket #{ticket.id} '{ticket.title}' has exceeded its SLA resolution deadline."
                )
                session.add(notif)

            audit = AuditLog(
                ticket_id=ticket.id,
                actor_id=0,  # System
                action="SLA_BREACH",
                new_value=f"breached at {now.isoformat()}"
            )
            session.add(audit)

        await session.commit()
        return len(breached_tickets)


@celery.task(name="app.tasks.sla_tasks.check_sla_breaches")
def check_sla_breaches():
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    count = loop.run_until_complete(_run_sla_check())
    logger.info(f"SLA breach check processed {count} overdue tickets.")
    return count
