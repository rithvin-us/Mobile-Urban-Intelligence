from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.event import EventResponse, EventCreate, EventStatusUpdate
from app.services import event_service
from app.services.redis_service import RedisService

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[EventResponse])
def list_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by event status"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return event_service.get_all_events(
        db,
        event_type=event_type,
        status=status_filter,
        limit=limit
    )

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found"
        )
    return event

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    db_event = event_service.create_event(db, event)
    
    # Broadcast event alert
    event_payload = {
        "type": "EVENT_ALERT",
        "data": {
            "id": db_event.id,
            "bus_id": db_event.bus_id,
            "event_type": db_event.event_type,
            "confidence": db_event.confidence,
            "severity": db_event.severity,
            "latitude": db_event.latitude,
            "longitude": db_event.longitude,
            "timestamp": db_event.timestamp.isoformat(),
            "status": db_event.status
        }
    }
    RedisService.publish_event_alert(event_payload)
    return db_event

@router.patch("/{event_id}/status", response_model=EventResponse)
def update_event_status(event_id: str, payload: EventStatusUpdate, db: Session = Depends(get_db)):
    event = event_service.update_event_status(db, event_id, payload.status)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID '{event_id}' not found"
        )
    return event
