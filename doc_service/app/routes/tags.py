from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from app.database import get_db
from app.schemas.tag import TagCreate, TagResponse, TagList
from app.services.tag_service import TagService
from app.utils.auth_deps import require_role

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.get("", response_model=TagList)
async def list_tags(db: AsyncSession = Depends(get_db)):
    """List all available tags."""
    tags = await TagService.get_all(db)
    return TagList(
        tags=[TagResponse.model_validate(t) for t in tags],
        total=len(tags)
    )


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_role(["Agent", "Admin"]))
):
    """Create a new tag (Agent or Admin only)."""
    tag = await TagService.create(db, data)
    return TagResponse.model_validate(tag)
