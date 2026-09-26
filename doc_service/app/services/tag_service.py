from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from typing import List, Optional
from app.models.tag import Tag
from app.schemas.tag import TagCreate
from app.utils.slug import slugify


class TagService:
    @staticmethod
    async def get_all(db: AsyncSession) -> List[Tag]:
        result = await db.execute(select(Tag).order_by(Tag.name.asc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, tag_id: int) -> Optional[Tag]:
        result = await db.execute(select(Tag).where(Tag.id == tag_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_slug(db: AsyncSession, slug: str) -> Optional[Tag]:
        result = await db.execute(select(Tag).where(Tag.slug == slug))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> Optional[Tag]:
        result = await db.execute(select(Tag).where(Tag.name == name))
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: TagCreate) -> Tag:
        clean_name = data.name.strip()
        slug = data.slug or slugify(clean_name)
        
        # Check uniqueness
        existing = await TagService.get_by_name(db, clean_name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tag with name '{clean_name}' already exists."
            )

        tag = Tag(name=clean_name, slug=slug)
        db.add(tag)
        await db.commit()
        await db.refresh(tag)
        return tag

    @staticmethod
    async def get_or_create_by_names(db: AsyncSession, tag_names: List[str]) -> List[Tag]:
        tags = []
        for name in tag_names:
            clean = name.strip()
            if not clean:
                continue
            existing = await TagService.get_by_name(db, clean)
            if existing:
                tags.append(existing)
            else:
                tag = Tag(name=clean, slug=slugify(clean))
                db.add(tag)
                await db.flush()
                tags.append(tag)
        return tags

    @staticmethod
    async def get_by_ids(db: AsyncSession, tag_ids: List[int]) -> List[Tag]:
        if not tag_ids:
            return []
        result = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        return list(result.scalars().all())
