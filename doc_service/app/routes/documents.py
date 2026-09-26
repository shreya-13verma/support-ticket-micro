import math
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List
from app.database import get_db
from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentStatusUpdate,
    DocumentResponse,
    DocumentListItem,
    DocumentListResponse
)
from app.services.document_service import DocumentService
from app.utils.auth_deps import require_role, get_current_user_claims, get_optional_user_claims

router = APIRouter(prefix="/docs", tags=["Documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    search: Optional[str] = Query(None, description="Search term across title, summary, content"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    category_slug: Optional[str] = Query(None, description="Filter by category slug"),
    tag_slug: Optional[str] = Query(None, description="Filter by tag slug"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (admin/agent only)"),
    author_id: Optional[int] = Query(None, description="Filter by author ID"),
    is_featured: Optional[bool] = Query(None, description="Filter by featured flag"),
    sort_by: str = Query("created_at", description="Sort by created_at, view_count, helpful_count, title"),
    sort_dir: str = Query("desc", description="asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_optional_user_claims)
):
    """List and search support documents with flexible filtering, sorting, and pagination."""
    docs, total = await DocumentService.search_and_list(
        db=db,
        search=search,
        category_id=category_id,
        category_slug=category_slug,
        tag_slug=tag_slug,
        status_filter=status_filter,
        author_id=author_id,
        is_featured=is_featured,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        limit=limit,
        user_claims=user_claims
    )

    total_pages = math.ceil(total / limit) if total > 0 else 1

    return DocumentListResponse(
        documents=[DocumentListItem.model_validate(d) for d in docs],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/{id_or_slug}", response_model=DocumentResponse)
async def get_document(
    id_or_slug: str = Path(..., description="Document integer ID or unique slug"),
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_optional_user_claims)
):
    """Retrieve single document by ID or slug. Automatically increments view count for published documents."""
    doc = None
    if id_or_slug.isdigit():
        doc = await DocumentService.get_by_id(db, int(id_or_slug))
    if not doc:
        doc = await DocumentService.get_by_slug(db, id_or_slug)

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    user_role = (user_claims.get("role") or "").lower() if user_claims else ""
    doc_status = getattr(doc, "status")

    # Visibility check
    if doc_status != "published":
        if user_role not in ["admin", "agent"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Increment view count if published
    if doc_status == "published":
        await DocumentService.increment_views(db, int(getattr(doc, "id")))

    return DocumentResponse.model_validate(doc)


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_role(["Agent", "Admin"]))
):
    """Create a new support document (Agent or Admin)."""
    author_id = int(claims.get("id", 1))
    user_role = claims.get("role", "Agent")
    doc = await DocumentService.create(db, data, author_id=author_id, user_role=user_role)
    return DocumentResponse.model_validate(doc)


@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: int,
    data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    claims: Dict[str, Any] = Depends(get_current_user_claims)
):
    """Update support document details (Admin or Author of draft)."""
    doc = await DocumentService.update(db, doc_id, data, claims)
    return DocumentResponse.model_validate(doc)


@router.patch("/{doc_id}/status", response_model=DocumentResponse)
async def update_document_status(
    doc_id: int,
    data: DocumentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_role(["Admin"]))
):
    """Update document publication status (Admin only)."""
    doc = await DocumentService.update_status(db, doc_id, data.status, claims)
    return DocumentResponse.model_validate(doc)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_role(["Admin"]))
):
    """Delete a support document (Admin only)."""
    await DocumentService.delete(db, doc_id, claims)
    return None


@router.post("/{doc_id}/view", status_code=status.HTTP_200_OK)
async def track_document_view(doc_id: int, db: AsyncSession = Depends(get_db)):
    """Explicitly increment document view count."""
    doc = await DocumentService.get_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    new_views = await DocumentService.increment_views(db, doc_id)
    return {"id": doc_id, "view_count": new_views}
