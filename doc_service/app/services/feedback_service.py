from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
from app.models.feedback import DocumentFeedback
from app.models.document import Document
from app.schemas.feedback import FeedbackCreate, FeedbackStatsResponse


class FeedbackService:
    @staticmethod
    async def record_feedback(
        db: AsyncSession,
        doc_id: int,
        data: FeedbackCreate,
        user_claims: Optional[Dict[str, Any]] = None,
        client_ip: Optional[str] = None
    ) -> DocumentFeedback:
        # Verify document exists and is published
        doc_res = await db.execute(select(Document).where(Document.id == doc_id))
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        
        if getattr(doc, "status") != "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Feedback can only be submitted for published documents."
            )

        user_id = int(user_claims["id"]) if user_claims and "id" in user_claims else None

        feedback = DocumentFeedback(
            document_id=doc_id,
            user_id=user_id,
            user_ip_hash=client_ip,
            is_helpful=data.is_helpful,
            comment=data.comment
        )
        db.add(feedback)

        # Atomic counter update on document
        if data.is_helpful:
            await db.execute(
                update(Document)
                .where(Document.id == doc_id)
                .values(helpful_count=Document.helpful_count + 1)
            )
        else:
            await db.execute(
                update(Document)
                .where(Document.id == doc_id)
                .values(not_helpful_count=Document.not_helpful_count + 1)
            )

        await db.commit()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def get_stats(db: AsyncSession, doc_id: int) -> FeedbackStatsResponse:
        doc_res = await db.execute(select(Document).where(Document.id == doc_id))
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        helpful: int = getattr(doc, "helpful_count", 0)
        not_helpful: int = getattr(doc, "not_helpful_count", 0)
        total = helpful + not_helpful
        ratio = round((helpful / total) * 100, 2) if total > 0 else 0.0

        return FeedbackStatsResponse(
            document_id=doc_id,
            helpful_count=helpful,
            not_helpful_count=not_helpful,
            total_feedbacks=total,
            helpful_ratio=ratio
        )
