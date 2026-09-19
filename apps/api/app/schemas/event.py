from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class EventType(str, Enum):
    POTHOLE = "POTHOLE"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    WATERLOGGING = "WATERLOGGING"
    TRAFFIC = "TRAFFIC"
    TRAFFIC_SIGN = "TRAFFIC_SIGN"
    ZEBRA_CROSSING = "ZEBRA_CROSSING"
    PEDESTRIAN_RISK = "PEDESTRIAN_RISK"
    INCIDENT = "INCIDENT"

class EventSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class EventStatus(str, Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    INVESTIGATING = "INVESTIGATING"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class EventBase(BaseModel):
    bus_id: str
    event_type: EventType
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    severity: EventSeverity = EventSeverity.MEDIUM
    latitude: float
    longitude: float
    status: EventStatus = EventStatus.NEW
    evidence_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default=None, alias="metadata_payload")

    # Accept either "metadata" or "metadata_payload" on input so producers
    # (simulator today, Jetson devices later) can post the natural key.
    model_config = ConfigDict(populate_by_name=True)

class EventCreate(EventBase):
    id: Optional[str] = None
    timestamp: Optional[datetime] = None

class EventResponse(EventBase):
    id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class EventStatusUpdate(BaseModel):
    status: EventStatus
