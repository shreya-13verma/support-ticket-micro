from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.routes import tickets, sla_and_notif, comments_and_files, reports, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Support Ticket Raiser - Assignment & Ticketing Service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router, prefix="/api/v1")
app.include_router(sla_and_notif.router, prefix="/api/v1")
app.include_router(comments_and_files.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(websocket.router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "assign_service"}
