from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.database import get_db
from app.schemas.document import DocumentSuggestionResponse, DocumentSuggestionItem, DocumentResponse
from app.services.document_service import DocumentService
from app.utils.security import verify_internal_api_key

router = APIRouter(prefix="/internal/docs", tags=["Internal"])


@router.get("/suggest", response_model=DocumentSuggestionResponse)
async def suggest_documents(
    q: str = Query("", description="Keywords or topic from ticket"),
    category_id: Optional[int] = Query(None, description="Category filter"),
    limit: int = Query(5, ge=1, le=20, description="Max suggestions to return"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_internal_api_key)
):
    """Internal suggestion endpoint used by assign_service to assist agents during ticket handling."""
    docs = await DocumentService.suggest(db, query_text=q, category_id=category_id, limit=limit)
    items = []
    for d in docs:
        cat_name = d.category.name if d.category else None
        items.append(
            DocumentSuggestionItem(
                id=int(getattr(d, "id")),
                title=str(getattr(d, "title")),
                slug=str(getattr(d, "slug")),
                summary=getattr(d, "summary", None),
                category_name=cat_name,
                view_count=int(getattr(d, "view_count", 0)),
                helpful_count=int(getattr(d, "helpful_count", 0))
            )
        )
    return DocumentSuggestionResponse(query=q, suggestions=items)


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_internal_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_internal_api_key)
):
    """Internal fetch of document details by ID."""
    doc = await DocumentService.get_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentResponse.model_validate(doc)
