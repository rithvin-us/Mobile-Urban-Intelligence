from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.bus import Bus
from app.schemas.bus import BusTelemetryUpdate

def get_all_buses(db: Session) -> List[Bus]:
    buses = db.query(Bus).all()
    now = datetime.now(timezone.utc)
    updated = False
    for bus in buses:
        if bus.status != "INACTIVE" and bus.last_seen:
            last_seen_utc = bus.last_seen if bus.last_seen.tzinfo else bus.last_seen.replace(tzinfo=timezone.utc)
            if (now - last_seen_utc).total_seconds() > 20:
                bus.last_seen = now
                updated = True
    if updated:
        db.commit()
    return buses

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
