from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime
from app.schemas.category import CategoryResponse
from app.schemas.tag import TagResponse


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    summary: Optional[str] = Field(None, max_length=500)
    content: str = Field(..., min_length=1)
    category_id: int
    status: Literal["draft", "published", "archived"] = "draft"
    is_featured: bool = False


class DocumentCreate(DocumentBase):
    slug: Optional[str] = Field(None, max_length=250)
    tag_ids: Optional[List[int]] = Field(default_factory=list)
    tag_names: Optional[List[str]] = Field(default_factory=list)


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    slug: Optional[str] = Field(None, max_length=250)
    summary: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = Field(None, min_length=1)
    category_id: Optional[int] = None
    status: Optional[Literal["draft", "published", "archived"]] = None
    is_featured: Optional[bool] = None
    tag_ids: Optional[List[int]] = None
    tag_names: Optional[List[str]] = None


class DocumentStatusUpdate(BaseModel):
    status: Literal["draft", "published", "archived"]


class DocumentResponse(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    author_id: int
    view_count: int
    helpful_count: int
    not_helpful_count: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    tags: List[TagResponse] = Field(default_factory=list)


class DocumentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    summary: Optional[str] = None
    category_id: int
    author_id: int
    status: str
    is_featured: bool
    view_count: int
    helpful_count: int
    not_helpful_count: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    tags: List[TagResponse] = Field(default_factory=list)


class DocumentListResponse(BaseModel):
    documents: List[DocumentListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class DocumentSuggestionItem(BaseModel):
    id: int
    title: str
    slug: str
    summary: Optional[str] = None
    category_name: Optional[str] = None
    view_count: int
    helpful_count: int


class DocumentSuggestionResponse(BaseModel):
    query: str
    suggestions: List[DocumentSuggestionItem]
