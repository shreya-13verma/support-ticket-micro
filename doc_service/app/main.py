from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base
from app.routes import (
    categories_router,
    tags_router,
    documents_router,
    feedback_router,
    internal_router
)
from app.utils.logging import RequestLoggingMiddleware
from app.models import *  # noqa: F401, F403


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Support Ticket Raiser - Document Service",
    description="Backend microservice for Support Documents & Knowledge Base",
    version="1.0.0",
    lifespan=lifespan
)

# Request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(categories_router, prefix="/api/v1")
app.include_router(tags_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(feedback_router, prefix="/api/v1")
app.include_router(internal_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "doc_service",
        "database": "connected"
    }
