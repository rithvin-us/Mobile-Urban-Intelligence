import random
from typing import Dict, Any, Optional

from simulator.buses.manager import SimulatedBus

EVENT_TYPES = [
    "POTHOLE",
    "ROAD_DAMAGE",
    "WATERLOGGING",
    "TRAFFIC",
    "TRAFFIC_SIGN",
    "ZEBRA_CROSSING",
    "PEDESTRIAN_RISK",
    "INCIDENT",
]

# Weighted to what a road-facing camera actually sees most often.
OPPORTUNISTIC_TYPES = [
    ("POTHOLE", 26),
    ("ROAD_DAMAGE", 18),
    ("TRAFFIC", 20),
    ("WATERLOGGING", 8),
    ("TRAFFIC_SIGN", 9),
    ("ZEBRA_CROSSING", 7),
    ("PEDESTRIAN_RISK", 8),
    ("INCIDENT", 4),
]

SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

EVIDENCE_TEMPLATES = {
    "POTHOLE": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/pothole_sample.jpg",
    "ROAD_DAMAGE": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/road_damage_sample.jpg",
    "WATERLOGGING": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/waterlogging_sample.jpg",
    "INCIDENT": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/incident_sample.jpg",
}

DEFAULT_EVIDENCE = "https://storage.googleapis.com/sih26124-urban-sensing/evidence/default_sample.jpg"


def _weighted_event_type() -> str:
    population = [name for name, _ in OPPORTUNISTIC_TYPES]
    weights = [weight for _, weight in OPPORTUNISTIC_TYPES]
    return random.choices(population, weights=weights, k=1)[0]


def _build_payload(
    bus: SimulatedBus,
    event_type: str,
    severity: str,
    latitude: float,
    longitude: float,
    source: str,
) -> Dict[str, Any]:
    return {
        "bus_id": bus.bus_id,
        "event_type": event_type,
        "confidence": round(random.uniform(0.71, 0.98), 2),
        "severity": severity,
        "latitude": round(latitude, 6),
        "longitude": round(longitude, 6),
        "status": "NEW",
        "evidence_url": EVIDENCE_TEMPLATES.get(event_type, DEFAULT_EVIDENCE),
        "metadata": {
            "bus_number": bus.bus_number,
            "route_name": bus.route_name,
            "speed_kmph": round(bus.speed, 1),
            "detection_source": source,
        },
    }


def generate_hotspot_event(bus: SimulatedBus) -> Optional[Dict[str, Any]]:
    """A report of the fixed road fault the bus is currently passing."""
    hotspot = bus.nearby_hotspot()
    if not hotspot:
        return None
    # GPS scatter of a few metres around the same physical defect.
    lat = hotspot["lat"] + random.uniform(-0.00008, 0.00008)
    lon = hotspot["lon"] + random.uniform(-0.00008, 0.00008)
    return _build_payload(bus, hotspot["type"], hotspot["severity"], lat, lon, "EDGE_DETECTOR")


def generate_random_event(bus: SimulatedBus) -> Dict[str, Any]:
    """An opportunistic detection at the bus's current position."""
    event_type = _weighted_event_type()
    severity = random.choices(SEVERITIES, weights=[34, 38, 20, 8], k=1)[0]
    lat = bus.lat + random.uniform(-0.0003, 0.0003)
    lon = bus.lon + random.uniform(-0.0003, 0.0003)
    return _build_payload(bus, event_type, severity, lat, lon, "EDGE_DETECTOR")
