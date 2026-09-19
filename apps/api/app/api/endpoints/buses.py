from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.bus import BusResponse, BusTelemetryUpdate
from app.services import bus_service
from app.services.redis_service import RedisService

router = APIRouter(prefix="/buses", tags=["Buses"])

@router.get("", response_model=List[BusResponse])
def list_buses(db: Session = Depends(get_db)):
    return bus_service.get_all_buses(db)

@router.get("/{bus_id}", response_model=BusResponse)
def get_bus(bus_id: str, db: Session = Depends(get_db)):
    bus = bus_service.get_bus_by_id(db, bus_id)
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus with ID '{bus_id}' not found"
        )
    return bus

@router.post("/telemetry", response_model=BusResponse, status_code=status.HTTP_200_OK)
def update_bus_telemetry(telemetry: BusTelemetryUpdate, db: Session = Depends(get_db)):
    bus = bus_service.update_or_create_telemetry(db, telemetry)
    
    # Broadcast to Redis Spatial Index & WebSockets
    RedisService.update_bus_geo(bus.id, bus.longitude, bus.latitude)
    telemetry_payload = {
        "type": "TELEMETRY_UPDATE",
        "data": {
            "id": bus.id,
            "bus_number": bus.bus_number,
            "route_name": bus.route_name,
            "latitude": bus.latitude,
            "longitude": bus.longitude,
            "heading": bus.heading,
            "speed": bus.speed,
            "status": bus.status
        }
    }
    RedisService.publish_bus_update(telemetry_payload)
    return bus

@router.post("/telemetry/batch", response_model=List[BusResponse], status_code=status.HTTP_200_OK)
def update_bus_telemetry_batch(telemetry_batch: List[BusTelemetryUpdate], db: Session = Depends(get_db)):
    """
    Micro-batch telemetry ingestion endpoint.
    Reduces edge HTTP connection overhead by up to 90%.
    """
    updated_buses = []
    for item in telemetry_batch:
        bus = bus_service.update_or_create_telemetry(db, item)
        RedisService.update_bus_geo(bus.id, bus.longitude, bus.latitude)
        updated_buses.append(bus)
    return updated_buses

