from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from app.database import get_db
from app.models.entities import SLAPolicy, Notification
from app.schemas.sla_and_notif import SLAPolicyCreate, SLAPolicyOut, NotificationOut
from app.utils.auth_deps import get_current_user_claims, require_role

router = APIRouter(tags=["SLA & Notifications"])


# SLA Policies
@router.get("/sla/policies", response_model=List[SLAPolicyOut])
async def list_sla_policies(
    db: AsyncSession = Depends(get_db),
    _user: Dict[str, Any] = Depends(get_current_user_claims)
):
    result = await db.execute(select(SLAPolicy))
    return list(result.scalars().all())


@router.post("/sla/policies", response_model=SLAPolicyOut, status_code=status.HTTP_201_CREATED)
async def create_or_update_sla_policy(
    policy_in: SLAPolicyCreate,
    db: AsyncSession = Depends(get_db),
    _admin: Dict[str, Any] = Depends(require_role(["admin"]))
):
    query = select(SLAPolicy).where(SLAPolicy.priority == policy_in.priority)
    result = await db.execute(query)
    policy = result.scalar_one_or_none()

    if policy:
        policy_obj: Any = policy
        policy_obj.response_time_hours = policy_in.response_time_hours
        policy_obj.resolution_time_hours = policy_in.resolution_time_hours
    else:
        policy = SLAPolicy(
            priority=policy_in.priority,
            response_time_hours=policy_in.response_time_hours,
            resolution_time_hours=policy_in.resolution_time_hours
        )
        db.add(policy)

    await db.commit()
    await db.refresh(policy)
    return policy


# Notifications
@router.get("/notifications", response_model=List[NotificationOut])
async def list_user_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_claims)
):
    user_id = current_user["id"]
    query = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.put("/notifications/{notif_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notif_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_claims)
):
    query = select(Notification).where(Notification.id == notif_id)
    result = await db.execute(query)
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if int(str(notif.user_id)) != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

    notif_obj: Any = notif
    notif_obj.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif
