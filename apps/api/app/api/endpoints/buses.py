from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.bus import BusResponse, BusTelemetryUpdate
from app.services import bus_service

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
    return bus_service.update_or_create_telemetry(db, telemetry)
