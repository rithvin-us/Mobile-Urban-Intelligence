from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.cluster_service import get_spatial_defect_clusters

router = APIRouter(prefix="/events/clusters", tags=["Events"])

@router.get("", response_model=List[Dict[str, Any]])
def list_defect_clusters(
    max_distance_meters: float = Query(25.0, ge=5.0, le=100.0, description="Spatial clustering radius in meters"),
    db: Session = Depends(get_db)
):
    """
    Returns spatial clusters of defect detections across buses.
    Merges repeated detections into verified Municipal Defect Work Orders.
    """
    return get_spatial_defect_clusters(db, max_distance_meters=max_distance_meters)
