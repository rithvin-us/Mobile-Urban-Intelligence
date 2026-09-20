import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, JSON, Text
from app.core.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    bus_id = Column(String(36), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    confidence = Column(Float, nullable=False, default=1.0)
    severity = Column(String(20), nullable=False, default="MEDIUM")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    status = Column(String(20), nullable=False, default="NEW")
    # Text, not VARCHAR(500): an edge unit can hand us a long signed object
    # URL, and Postgres raises StringDataRightTruncation rather than trimming.
    evidence_url = Column(Text, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    metadata_payload = Column("metadata_payload", JSON, nullable=True)


