import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from app.database import get_db
from app.config import settings
from app.models.entities import Comment, Attachment, AuditLog
from app.schemas.ticket import CommentOut, AttachmentOut, AuditLogOut
from app.schemas.comments_and_reports import CommentCreate
from app.services.ticket_service import TicketService
from app.utils.auth_deps import get_current_user_claims

router = APIRouter(tags=["Comments & Attachments"])

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "text/plain", "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}
FORBIDDEN_EXTENSIONS = {".exe", ".sh", ".bat", ".bin", ".cmd", ".msi", ".py", ".js"}


@router.post("/tickets/{ticket_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(
    ticket_id: int,
    comment_in: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_claims)
):
    ticket = await TicketService.get_ticket(ticket_id, current_user, db)

    # Customers cannot post internal comments
    is_internal = comment_in.is_internal if current_user.get("role") in ["agent", "admin"] else False

    comment = Comment(
        ticket_id=ticket.id,
        author_id=current_user["id"],
        author_name=current_user.get("email", f"User {current_user['id']}"),
        content=comment_in.content,
        is_internal=is_internal
    )
    db.add(comment)

    audit = AuditLog(
        ticket_id=ticket.id,
        actor_id=current_user["id"],
        action="ADD_COMMENT",
        new_value=f"Internal: {is_internal}"
    )
    db.add(audit)
    await db.commit()
    await db.refresh(comment)
    return comment


@router.get("/tickets/{ticket_id}/comments", response_model=List[CommentOut])
async def list_comments(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_claims)
):
    await TicketService.get_ticket(ticket_id, current_user, db)

    query = select(Comment).where(Comment.ticket_id == ticket_id)
    # Filter out internal notes for regular users
    if current_user.get("role") == "user":
        query = query.where(Comment.is_internal.is_(False))

    query = query.order_by(Comment.created_at.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/tickets/{ticket_id}/attachments", response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_claims)
):
    ticket = await TicketService.get_ticket(ticket_id, current_user, db)

    # Validate filename and extension
    original_filename = file.filename or "file"
    file_ext = Path(original_filename).suffix.lower()
    if file_ext in FORBIDDEN_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File extension not allowed")

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Content type '{content_type}' not allowed")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    unique_name = f"{uuid.uuid4()}_{original_filename}"
    saved_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    # Read and enforce max file size
    contents = await file.read()
    file_size = len(contents)
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    with open(saved_path, "wb") as f:
        f.write(contents)

    attachment = Attachment(
        ticket_id=ticket.id,
        uploaded_by=current_user["id"],
        filename=original_filename,
        file_path=saved_path,
        file_size=file_size,
        content_type=content_type
    )
    db.add(attachment)

    audit = AuditLog(
        ticket_id=ticket.id,
        actor_id=current_user["id"],
        action="UPLOAD_ATTACHMENT",
        new_value=original_filename
    )
    db.add(audit)
    await db.commit()
    await db.refresh(attachment)
    return attachment


@router.get("/tickets/{ticket_id}/history", response_model=List[AuditLogOut])
async def get_ticket_history(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_claims)
):
    await TicketService.get_ticket(ticket_id, current_user, db)
    query = select(AuditLog).where(AuditLog.ticket_id == ticket_id).order_by(AuditLog.created_at.asc())
    result = await db.execute(query)
    return list(result.scalars().all())
