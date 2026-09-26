from app.routes.categories import router as categories_router
from app.routes.tags import router as tags_router
from app.routes.documents import router as documents_router
from app.routes.feedback import router as feedback_router
from app.routes.internal import router as internal_router

__all__ = ["categories_router", "tags_router", "documents_router", "feedback_router", "internal_router"]
