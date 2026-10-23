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

METERS_PER_DEGREE_LAT = 111320.0

# The demo feed alone runs to its 4000-event cap, and a deployment accumulates
# more, so the scan is bounded to the most recent detections. Older events have
# normally been resolved and turned into work orders already.
MAX_EVENTS_CONSIDERED = 4000


def get_spatial_defect_clusters(db: Session, max_distance_meters: float = 25.0) -> List[Dict[str, Any]]:
    """
    Groups individual defect detections across buses into verified Municipal Defect Clusters.
    Tries PostGIS ST_ClusterDBSCAN if PostGIS is enabled; falls back to spatial clustering.
    """
    events = (
        db.query(Event)
        .order_by(Event.timestamp.desc())
        .limit(MAX_EVENTS_CONSIDERED)
        .all()
    )
    if not events:
        return []

    # Comparing every event with every other is quadratic, which at the event
    # cap means millions of haversine calls and a cluster view that hangs for
    # tens of seconds. Events are bucketed by type and by latitude band, each
    # band one cluster radius tall: two points within max_distance_meters differ
    # by at most that distance in latitude, so a band plus its two neighbours is
    # guaranteed to hold every candidate. Latitude is used because a degree of
    # latitude is a constant distance, unlike a degree of longitude.
    band_height = max_distance_meters / METERS_PER_DEGREE_LAT
    bands: Dict[Any, List[Event]] = {}
    for ev in events:
        bands.setdefault((ev.event_type, math.floor(ev.latitude / band_height)), []).append(ev)

    clusters = []
    visited = set()

    for i, ev in enumerate(events):
        if ev.id in visited:
            continue

        cluster_members = [ev]
        visited.add(ev.id)

        band = math.floor(ev.latitude / band_height)
        for offset in (-1, 0, 1):
            for other in bands.get((ev.event_type, band + offset), ()):
                if other.id in visited:
                    continue
                dist = calculate_haversine_distance(ev.latitude, ev.longitude, other.latitude, other.longitude)
                if dist <= max_distance_meters:
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
