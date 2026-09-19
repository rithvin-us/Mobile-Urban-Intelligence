from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.event import EventResponse, EventCreate
from app.services import event_service

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
    return event_service.create_event(db, event)
