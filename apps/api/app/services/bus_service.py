from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.bus import Bus
from app.schemas.bus import BusCreate, BusTelemetryUpdate

def get_all_buses(db: Session) -> List[Bus]:
    return db.query(Bus).all()

def get_bus_by_id(db: Session, bus_id: str) -> Optional[Bus]:
    return db.query(Bus).filter(Bus.id == bus_id).first()

def update_or_create_telemetry(db: Session, telemetry: BusTelemetryUpdate) -> Bus:
    bus = db.query(Bus).filter(Bus.id == telemetry.bus_id).first()
    if not bus:
        bus = Bus(
            id=telemetry.bus_id,
            bus_number=telemetry.bus_number or f"BUS-{telemetry.bus_id[:4]}",
            route_name=telemetry.route_name or "Route 1",
            status=telemetry.status or "ACTIVE",
            latitude=telemetry.latitude,
            longitude=telemetry.longitude,
            heading=telemetry.heading,
            speed=telemetry.speed,
            last_seen=datetime.now(timezone.utc)
        )
        db.add(bus)
    else:
        bus.latitude = telemetry.latitude
        bus.longitude = telemetry.longitude
        bus.heading = telemetry.heading
        bus.speed = telemetry.speed
        if telemetry.bus_number:
            bus.bus_number = telemetry.bus_number
        if telemetry.route_name:
            bus.route_name = telemetry.route_name
        if telemetry.status:
            bus.status = telemetry.status
        bus.last_seen = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(bus)
    return bus
