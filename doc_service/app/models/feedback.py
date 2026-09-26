from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class DocumentFeedback(Base):
    __tablename__ = "document_feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)  # Nullable if visitor
    user_ip_hash = Column(String(64), nullable=True, index=True)
    is_helpful = Column(Boolean, nullable=False)
    comment = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    document = relationship("Document", back_populates="feedbacks")
