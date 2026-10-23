from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base, ensure_schema, SessionLocal
from app.db.seed import seed_regional_fleet
from app.api.endpoints.health import router as health_router
from app.api.router import api_router
from app.services import demo_feed
from app.services.evidence_store import EVIDENCE_DIR, EVIDENCE_ROUTE, ensure_dir
from app.services.fleet_broadcast import run_fleet_broadcaster

import asyncio
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables automatically, apply migrations, and seed regional fleet on startup."""
    try:
        Base.metadata.create_all(bind=engine)
        ensure_schema()
        with SessionLocal() as db:
            seed_regional_fleet(db)
    except Exception as e:
        logger.warning(f"Database table initialization warning: {e}")

    # Keeps a deployed demo live when no edge device or simulator is feeding it.
    demo_feed.start()

    # Gives /api/ws/fleet something to send. Idle until a client connects.
    broadcaster = asyncio.create_task(run_fleet_broadcaster())
    try:
        yield
    finally:
        broadcaster.cancel()
        try:
            await broadcaster
        except asyncio.CancelledError:
            pass
        demo_feed.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)



# CORS setup
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if not origins or "*" in origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Annotated camera frames posted by the edge units are written here and served
# back as ordinary cacheable images.
ensure_dir()
app.mount(EVIDENCE_ROUTE, StaticFiles(directory=str(EVIDENCE_DIR)), name="evidence")

# Include Routers
app.include_router(health_router)
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
