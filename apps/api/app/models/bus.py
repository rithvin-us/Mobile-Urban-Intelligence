import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime
from app.core.database import Base

class Bus(Base):
    __tablename__ = "buses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    bus_number = Column(String(50), nullable=False, index=True)
    route_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="ACTIVE")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    heading = Column(Float, nullable=False, default=0.0)
    speed = Column(Float, nullable=False, default=0.0)
    last_seen = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
