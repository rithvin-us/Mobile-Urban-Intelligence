import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.event import Event
from app.schemas.event import EventCreate

def get_all_events(
    db: Session,
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100
) -> List[Event]:
    query = db.query(Event)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    if status:
        query = query.filter(Event.status == status)
    return query.order_by(Event.timestamp.desc()).limit(limit).all()

def get_event_by_id(db: Session, event_id: str) -> Optional[Event]:
    return db.query(Event).filter(Event.id == event_id).first()

def create_event(db: Session, event_in: EventCreate) -> Event:
    event_id = event_in.id or str(uuid.uuid4())
    event_timestamp = event_in.timestamp or datetime.now(timezone.utc)
    
    db_event = Event(
        id=event_id,
        bus_id=event_in.bus_id,
        event_type=event_in.event_type.value if hasattr(event_in.event_type, "value") else str(event_in.event_type),
        confidence=event_in.confidence,
        severity=event_in.severity.value if hasattr(event_in.severity, "value") else str(event_in.severity),
        latitude=event_in.latitude,
        longitude=event_in.longitude,
        timestamp=event_timestamp,
        status=event_in.status.value if hasattr(event_in.status, "value") else str(event_in.status),
        evidence_url=event_in.evidence_url,
        metadata_payload=event_in.metadata
    )

    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def update_event_status(db: Session, event_id: str, new_status: str) -> Optional[Event]:
    """Applies an operator decision (acknowledge / investigate / resolve) to an event."""
    event = get_event_by_id(db, event_id)
    if not event:
        return None
    event.status = new_status.value if hasattr(new_status, "value") else str(new_status)
    db.commit()
    db.refresh(event)
    return event
