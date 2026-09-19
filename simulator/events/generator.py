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
    "INCIDENT"
]

SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

EVIDENCE_TEMPLATES = {
    "POTHOLE": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/pothole_sample.jpg",
    "ROAD_DAMAGE": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/road_damage_sample.jpg",
    "WATERLOGGING": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/waterlogging_sample.jpg",
    "INCIDENT": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/incident_sample.jpg"
}

def generate_random_event(bus: SimulatedBus) -> Dict[str, Any]:
    event_type = random.choice(EVENT_TYPES)
    severity = random.choice(SEVERITIES)
    confidence = round(random.uniform(0.75, 0.99), 2)
    
    # Slight coordinate offset relative to bus location
    lat_offset = random.uniform(-0.0003, 0.0003)
    lon_offset = random.uniform(-0.0003, 0.0003)

    return {
        "bus_id": bus.bus_id,
        "event_type": event_type,
        "confidence": confidence,
        "severity": severity,
        "latitude": round(bus.lat + lat_offset, 6),
        "longitude": round(bus.lon + lon_offset, 6),
        "status": "NEW",
        "evidence_url": EVIDENCE_TEMPLATES.get(event_type, "https://storage.googleapis.com/sih26124-urban-sensing/evidence/default_sample.jpg"),
        "metadata": {
            "bus_number": bus.bus_number,
            "route_name": bus.route_name,
            "detection_source": "SIMULATOR_JETSON_STUB"
        }
    }
