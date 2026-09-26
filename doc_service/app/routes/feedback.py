from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
from app.database import get_db
from app.schemas.feedback import FeedbackCreate, FeedbackResponse, FeedbackStatsResponse
from app.services.feedback_service import FeedbackService
from app.utils.auth_deps import require_role, get_optional_user_claims

router = APIRouter(prefix="/docs", tags=["Document Feedback"])


@router.post("/{doc_id}/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    doc_id: int,
    data: FeedbackCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_optional_user_claims)
):
    """Submit helpfulness rating (thumbs up/down) for a published support document."""
    client_ip = request.client.host if request.client else "unknown"
    feedback = await FeedbackService.record_feedback(
        db=db,
        doc_id=doc_id,
        data=data,
        user_claims=user_claims,
        client_ip=client_ip
    )
    return FeedbackResponse.model_validate(feedback)


@router.get("/{doc_id}/feedback/stats", response_model=FeedbackStatsResponse)
async def get_feedback_stats(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_role(["Agent", "Admin"]))
):
    """Get aggregate feedback metrics for a document (Agent or Admin only)."""
    return await FeedbackService.get_stats(db, doc_id)
