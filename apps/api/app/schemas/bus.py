from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class BusBase(BaseModel):
    bus_number: str
    route_name: str
    status: str = "ACTIVE"
    latitude: float
    longitude: float
    heading: float = 0.0
    speed: float = 0.0

class BusCreate(BusBase):
    id: Optional[str] = None

class BusTelemetryUpdate(BaseModel):
    bus_id: str
    bus_number: Optional[str] = None
    route_name: Optional[str] = None
    latitude: float
    longitude: float
    heading: float = 0.0
    speed: float = 0.0
    status: Optional[str] = "ACTIVE"

class BusResponse(BusBase):
    id: str
    last_seen: datetime

    model_config = ConfigDict(from_attributes=True)
