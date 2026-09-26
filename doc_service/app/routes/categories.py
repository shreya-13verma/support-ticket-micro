from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryList
from app.services.category_service import CategoryService
from app.utils.auth_deps import require_role, get_optional_user_claims

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=CategoryList)
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user_claims: Optional[Dict[str, Any]] = Depends(get_optional_user_claims)
):
    """List all categories. Visitors/Users see active categories only; Admins see all."""
    user_role = (user_claims.get("role") or "").lower() if user_claims else ""
    only_active = user_role != "admin"
    categories = await CategoryService.get_all(db, only_active=only_active)
    return CategoryList(
        categories=[CategoryResponse.model_validate(c) for c in categories],
        total=len(categories)
    )


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: int, db: AsyncSession = Depends(get_db)):
    """Get single category by ID."""
    category = await CategoryService.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return CategoryResponse.model_validate(category)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_role(["Admin"]))
):
    """Create a new document category (Admin only)."""
    category = await CategoryService.create(db, data)
    return CategoryResponse.model_validate(category)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_role(["Admin"]))
):
    """Update a category (Admin only)."""
    category = await CategoryService.update(db, category_id, data)
    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_role(["Admin"]))
):
    """Delete a category (Admin only, rejects if documents are attached)."""
    await CategoryService.delete(db, category_id)
    return None
