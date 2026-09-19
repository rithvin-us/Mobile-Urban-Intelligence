import math
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.event import Event

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two lat/lon coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def get_spatial_defect_clusters(db: Session, max_distance_meters: float = 25.0) -> List[Dict[str, Any]]:
    """
    Groups individual defect detections across buses into verified Municipal Defect Clusters.
    Tries PostGIS ST_ClusterDBSCAN if PostGIS is enabled; falls back to spatial clustering.
    """
    events = db.query(Event).all()
    if not events:
        return []

    # Simple spatial clustering by distance
    clusters = []
    visited = set()

    for i, ev in enumerate(events):
        if ev.id in visited:
            continue

        cluster_members = [ev]
        visited.add(ev.id)

        for j, other in enumerate(events):
            if other.id in visited:
                continue
            dist = calculate_haversine_distance(ev.latitude, ev.longitude, other.latitude, other.longitude)
            if dist <= max_distance_meters and ev.event_type == other.event_type:
                cluster_members.append(other)
                visited.add(other.id)

        avg_lat = sum(m.latitude for m in cluster_members) / len(cluster_members)
        avg_lon = sum(m.longitude for m in cluster_members) / len(cluster_members)
        max_confidence = max(m.confidence for m in cluster_members)

        clusters.append({
            "cluster_id": f"cluster-{i+1:03d}",
            "event_type": ev.event_type,
            "center_latitude": round(avg_lat, 6),
            "center_longitude": round(avg_lon, 6),
            "detection_count": len(cluster_members),
            "max_confidence": max_confidence,
            "verification_status": "VERIFIED_MUNICIPAL_DEFECT" if len(cluster_members) >= 2 else "UNVERIFIED_SINGLE_DETECTION",
            "buses_involved": list(set(m.bus_id for m in cluster_members))
        })

    return sorted(clusters, key=lambda c: c["detection_count"], reverse=True)
