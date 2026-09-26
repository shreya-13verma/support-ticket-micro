from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from typing import List, Optional, Tuple, Dict, Any
from app.models.document import Document, document_tags
from app.models.category import Category
from app.models.tag import Tag
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.services.category_service import CategoryService
from app.services.tag_service import TagService
from app.utils.slug import generate_unique_slug


class DocumentService:
    @staticmethod
    async def get_by_id(db: AsyncSession, doc_id: int) -> Optional[Document]:
        query = (
            select(Document)
            .where(Document.id == doc_id)
            .options(selectinload(Document.category), selectinload(Document.tags))
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_slug(db: AsyncSession, slug: str) -> Optional[Document]:
        query = (
            select(Document)
            .where(Document.slug == slug)
            .options(selectinload(Document.category), selectinload(Document.tags))
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: DocumentCreate, author_id: int, user_role: str) -> Document:
        # Validate category exists and is active
        category = await CategoryService.get_by_id(db, data.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {data.category_id} not found."
            )

        # Unique slug generation
        async def slug_exists(s: str) -> bool:
            res = await db.execute(select(Document.id).where(Document.slug == s))
            return res.scalar_one_or_none() is not None

        slug_base = data.slug or data.title
        unique_slug = await generate_unique_slug(slug_base, slug_exists)

        # Non-admin agents default to draft if not admin
        initial_status = data.status
        if user_role.lower() not in ["admin"] and initial_status != "draft":
            initial_status = "draft"

        # Resolve tags
        tags: List[Tag] = []
        if data.tag_ids:
            tags.extend(await TagService.get_by_ids(db, data.tag_ids))
        if data.tag_names:
            created_tags = await TagService.get_or_create_by_names(db, data.tag_names)
            for t in created_tags:
                if t not in tags:
                    tags.append(t)

        doc = Document(
            title=data.title,
            slug=unique_slug,
            summary=data.summary,
            content=data.content,
            category_id=data.category_id,
            author_id=author_id,
            status=initial_status,
            is_featured=data.is_featured,
            tags=tags
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return await DocumentService.get_by_id(db, doc.id)  # type: ignore

    @staticmethod
    async def update(
        db: AsyncSession,
        doc_id: int,
        data: DocumentUpdate,
        user_claims: Dict[str, Any]
    ) -> Document:
        doc = await DocumentService.get_by_id(db, doc_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        user_role = str(user_claims.get("role", "User")).lower()
        user_id = int(user_claims.get("id", 0))

        # Permission check: Admin can edit any document; Agent can edit only their own drafts
        if user_role != "admin":
            if getattr(doc, "author_id") != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to edit this document."
                )
            if getattr(doc, "status") not in ["draft"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Agents can only edit draft documents. Contact an Admin to update published documents."
                )

        update_dict = data.model_dump(exclude_unset=True)

        if "category_id" in update_dict and update_dict["category_id"] is not None:
            category = await CategoryService.get_by_id(db, update_dict["category_id"])
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category with id {update_dict['category_id']} not found."
                )
            setattr(doc, "category_id", update_dict["category_id"])

        if "slug" in update_dict and update_dict["slug"]:
            async def slug_exists(s: str) -> bool:
                res = await db.execute(select(Document.id).where(Document.slug == s, Document.id != doc_id))
                return res.scalar_one_or_none() is not None

            unique_slug = await generate_unique_slug(update_dict["slug"], slug_exists, str(doc.slug))
            setattr(doc, "slug", unique_slug)

        for field in ["title", "summary", "content", "is_featured"]:
            if field in update_dict and update_dict[field] is not None:
                setattr(doc, field, update_dict[field])

        if "status" in update_dict and update_dict["status"] is not None:
            if user_role != "admin" and update_dict["status"] != "draft":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can publish or archive documents."
                )
            setattr(doc, "status", update_dict["status"])

        # Tag associations update if provided
        if "tag_ids" in update_dict or "tag_names" in update_dict:
            new_tags: List[Tag] = []
            if update_dict.get("tag_ids"):
                new_tags.extend(await TagService.get_by_ids(db, update_dict["tag_ids"]))
            if update_dict.get("tag_names"):
                created = await TagService.get_or_create_by_names(db, update_dict["tag_names"])
                for t in created:
                    if t not in new_tags:
                        new_tags.append(t)
            doc.tags = new_tags

        await db.commit()
        await db.refresh(doc)
        return await DocumentService.get_by_id(db, doc.id)  # type: ignore

    @staticmethod
    async def update_status(
        db: AsyncSession,
        doc_id: int,
        new_status: str,
        user_claims: Dict[str, Any]
    ) -> Document:
        doc = await DocumentService.get_by_id(db, doc_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        user_role = str(user_claims.get("role", "User")).lower()
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change document publication status."
            )

        setattr(doc, "status", new_status)
        await db.commit()
        await db.refresh(doc)
        return doc

    @staticmethod
    async def delete(db: AsyncSession, doc_id: int, user_claims: Dict[str, Any]) -> None:
        doc = await DocumentService.get_by_id(db, doc_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        user_role = str(user_claims.get("role", "User")).lower()
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can delete documents."
            )

        await db.delete(doc)
        await db.commit()

    @staticmethod
    async def increment_views(db: AsyncSession, doc_id: int) -> int:
        await db.execute(
            update(Document)
            .where(Document.id == doc_id)
            .values(view_count=Document.view_count + 1)
        )
        await db.commit()
        res = await db.execute(select(Document.view_count).where(Document.id == doc_id))
        return res.scalar() or 0

    @staticmethod
    async def search_and_list(
        db: AsyncSession,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        category_slug: Optional[str] = None,
        tag_slug: Optional[str] = None,
        status_filter: Optional[str] = None,
        author_id: Optional[int] = None,
        is_featured: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        page: int = 1,
        limit: int = 20,
        user_claims: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Document], int]:
        user_role = (user_claims.get("role") or "visitor").lower() if user_claims else "visitor"

        query = select(Document).options(selectinload(Document.category), selectinload(Document.tags))
        count_query = select(func.count(Document.id))

        # Role-based status visibility guard
        if user_role in ["admin"]:
            if status_filter:
                query = query.where(Document.status == status_filter)
                count_query = count_query.where(Document.status == status_filter)
        elif user_role in ["agent"]:
            if status_filter:
                query = query.where(Document.status == status_filter)
                count_query = count_query.where(Document.status == status_filter)
            else:
                query = query.where(Document.status.in_(["published", "draft"]))
                count_query = count_query.where(Document.status.in_(["published", "draft"]))
        else:
            # Visitor / Customer: strictly published
            query = query.where(Document.status == "published")
            count_query = count_query.where(Document.status == "published")

        # Category filters
        if category_id:
            query = query.where(Document.category_id == category_id)
            count_query = count_query.where(Document.category_id == category_id)
        elif category_slug:
            query = query.join(Category).where(Category.slug == category_slug)
            count_query = count_query.join(Category).where(Category.slug == category_slug)

        # Tag filter
        if tag_slug:
            query = query.join(Document.tags).where(Tag.slug == tag_slug)
            count_query = count_query.join(Document.tags).where(Tag.slug == tag_slug)

        # Author filter
        if author_id:
            query = query.where(Document.author_id == author_id)
            count_query = count_query.where(Document.author_id == author_id)

        # Featured filter
        if is_featured is not None:
            query = query.where(Document.is_featured == is_featured)
            count_query = count_query.where(Document.is_featured == is_featured)

        # Text search across title, summary, content
        if search and search.strip():
            words = [w.strip() for w in search.strip().split() if len(w.strip()) > 1]
            if words:
                clauses = [
                    or_(
                        Document.title.ilike(f"%{w}%"),
                        Document.summary.ilike(f"%{w}%"),
                        Document.content.ilike(f"%{w}%")
                    )
                    for w in words
                ]
                search_clause = or_(*clauses)
                query = query.where(search_clause)
                count_query = count_query.where(search_clause)

        # Total count
        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0

        # Sorting
        sort_column = Document.created_at
        if sort_by == "view_count" or sort_by == "views":
            sort_column = Document.view_count
        elif sort_by == "helpful_count" or sort_by == "helpfulness":
            sort_column = Document.helpful_count
        elif sort_by == "title":
            sort_column = Document.title

        if sort_dir.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        # Pagination
        offset = max(0, (page - 1) * limit)
        query = query.offset(offset).limit(limit)

        result = await db.execute(query)
        documents = list(result.scalars().all())

        return documents, total

    @staticmethod
    async def suggest(
        db: AsyncSession,
        query_text: str,
        category_id: Optional[int] = None,
        limit: int = 5
    ) -> List[Document]:
        """Internal suggestion search for assign_service agents."""
        query = (
            select(Document)
            .where(Document.status == "published")
            .options(selectinload(Document.category))
        )
        if category_id:
            query = query.where(Document.category_id == category_id)

        if query_text and query_text.strip():
            words = [w.strip() for w in query_text.strip().split() if len(w.strip()) > 1]
            if words:
                clauses = [
                    or_(
                        Document.title.ilike(f"%{w}%"),
                        Document.summary.ilike(f"%{w}%"),
                        Document.content.ilike(f"%{w}%")
                    )
                    for w in words
                ]
                query = query.where(or_(*clauses))

        query = query.order_by(Document.helpful_count.desc(), Document.view_count.desc()).limit(limit)
        res = await db.execute(query)
        return list(res.scalars().all())
