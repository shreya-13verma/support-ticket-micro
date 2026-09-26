from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from typing import List, Optional, cast
from app.models.category import Category
from app.models.document import Document
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.utils.slug import generate_unique_slug


class CategoryService:
    @staticmethod
    async def get_all(db: AsyncSession, only_active: bool = False) -> List[Category]:
        query = select(Category).order_by(Category.display_order.asc(), Category.name.asc())
        if only_active:
            query = query.where(Category.is_active == True)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, category_id: int) -> Optional[Category]:
        result = await db.execute(select(Category).where(Category.id == category_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_slug(db: AsyncSession, slug: str) -> Optional[Category]:
        result = await db.execute(select(Category).where(Category.slug == slug))
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: CategoryCreate) -> Category:
        async def slug_exists(s: str) -> bool:
            res = await db.execute(select(Category.id).where(Category.slug == s))
            return res.scalar_one_or_none() is not None

        slug = data.slug or data.name
        unique_slug = await generate_unique_slug(slug, slug_exists)

        category = Category(
            name=data.name,
            slug=unique_slug,
            description=data.description,
            display_order=data.display_order,
            is_active=data.is_active
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def update(db: AsyncSession, category_id: int, data: CategoryUpdate) -> Category:
        category = await CategoryService.get_by_id(db, category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        update_dict = data.model_dump(exclude_unset=True)
        if "slug" in update_dict and update_dict["slug"]:
            async def slug_exists(s: str) -> bool:
                res = await db.execute(select(Category.id).where(Category.slug == s, Category.id != category_id))
                return res.scalar_one_or_none() is not None

            unique_slug = await generate_unique_slug(update_dict["slug"], slug_exists, str(category.slug))
            setattr(category, "slug", unique_slug)

        if "name" in update_dict:
            setattr(category, "name", update_dict["name"])
        if "description" in update_dict:
            setattr(category, "description", update_dict["description"])
        if "display_order" in update_dict:
            setattr(category, "display_order", update_dict["display_order"])
        if "is_active" in update_dict:
            setattr(category, "is_active", update_dict["is_active"])

        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def delete(db: AsyncSession, category_id: int) -> None:
        category = await CategoryService.get_by_id(db, category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        # Check if active documents exist in this category
        doc_count_res = await db.execute(
            select(func.count(Document.id)).where(Document.category_id == category_id)
        )
        doc_count = doc_count_res.scalar() or 0
        if doc_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete category: {doc_count} document(s) are associated with this category."
            )

        await db.delete(category)
        await db.commit()
