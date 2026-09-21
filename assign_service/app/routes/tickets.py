from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from app.database import get_db
from app.schemas.ticket import (
    TicketCreate,
    TicketOut,
    TicketAssignRequest,
    TicketStatusRequest
)
from app.services.ticket_service import TicketService
from app.utils.auth_deps import get_current_user_claims, require_role

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.post("/", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_claims)
):
    return await TicketService.create_ticket(ticket_in, current_user, db)


@router.get("/", response_model=List[TicketOut])
async def list_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_claims)
):
    return await TicketService.list_tickets(current_user, db)


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_claims)
):
    return await TicketService.get_ticket(ticket_id, current_user, db)


@router.put("/{ticket_id}/assign", response_model=TicketOut)
async def assign_ticket(
    ticket_id: int,
    assign_in: TicketAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role(["agent", "admin"]))
):
    return await TicketService.assign_ticket(ticket_id, assign_in, current_user, db)


@router.put("/{ticket_id}/status", response_model=TicketOut)
async def update_status(
    ticket_id: int,
    status_in: TicketStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role(["agent", "admin"]))
):
    return await TicketService.update_status(ticket_id, status_in, current_user, db)
