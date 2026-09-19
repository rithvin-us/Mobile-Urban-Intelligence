from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.bus import Bus
from app.models.event import Event

router = APIRouter()

# A bus that has not reported within this window is treated as offline, and a
# fleet with no fresh telemetry at all means the ingest pipeline has stalled.
TELEMETRY_FRESH_SECONDS = 30
TELEMETRY_STALE_SECONDS = 120


@router.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "urban-intelligence-api",
        "version": "0.1.0"
    }


@router.get("/health/system", tags=["Health"])
def system_health(db: Session = Depends(get_db)):
    """Live status of the sensing pipeline, as shown in the dashboard status rail."""
    now = datetime.now(timezone.utc)

    database_online = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database_online = False

    last_telemetry = None
    bus_count = 0
    event_count = 0
    if database_online:
        try:
            last_telemetry = db.query(func.max(Bus.last_seen)).scalar()
            bus_count = db.query(func.count(Bus.id)).scalar() or 0
            event_count = db.query(func.count(Event.id)).scalar() or 0
        except Exception:
            database_online = False

    age_seconds = None
    if last_telemetry is not None:
        if last_telemetry.tzinfo is None:
            last_telemetry = last_telemetry.replace(tzinfo=timezone.utc)
        age_seconds = max(0.0, (now - last_telemetry).total_seconds())

    if age_seconds is None:
        ingest = "STOPPED"
    elif age_seconds <= TELEMETRY_FRESH_SECONDS:
        ingest = "RUNNING"
    elif age_seconds <= TELEMETRY_STALE_SECONDS:
        ingest = "STALE"
    else:
        ingest = "STOPPED"

    return {
        "api": "ONLINE",
        "database": "ONLINE" if database_online else "OFFLINE",
        "ingest": ingest,
        "last_telemetry": last_telemetry.isoformat() if last_telemetry else None,
        "telemetry_age_seconds": age_seconds,
        "buses": bus_count,
        "events": event_count,
        "server_time": now.isoformat(),
    }
