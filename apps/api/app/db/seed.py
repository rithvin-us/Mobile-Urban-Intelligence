import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.bus import Bus
from app.models.event import Event

logger = logging.getLogger(__name__)

REGIONAL_SEED_BUSES = [
    {"id": "bus-001", "bus_number": "BUS-001", "route_name": "101", "lat": 11.3000, "lng": 76.9500, "speed": 45.0, "heading": 15.0, "status": "ACTIVE"}, # Mettupalayam Town
    {"id": "bus-002", "bus_number": "BUS-002", "route_name": "202", "lat": 11.1920, "lng": 77.2680, "speed": 52.0, "heading": 65.0, "status": "ACTIVE"}, # Avinashi Bypass
    {"id": "bus-003", "bus_number": "BUS-003", "route_name": "303", "lat": 10.7020, "lng": 77.0080, "speed": 48.0, "heading": 185.0, "status": "ACTIVE"}, # Achipatti / Pollachi
    {"id": "bus-004", "bus_number": "BUS-004", "route_name": "404", "lat": 11.2320, "lng": 77.1050, "speed": 42.0, "heading": 40.0, "status": "ACTIVE"}, # Annur Town
    {"id": "bus-005", "bus_number": "BUS-005", "route_name": "505", "lat": 10.8420, "lng": 76.8200, "speed": 50.0, "heading": 220.0, "status": "ACTIVE"}, # Walayar TN-KL Border
    {"id": "bus-006", "bus_number": "BUS-006", "route_name": "606", "lat": 10.9980, "lng": 77.2850, "speed": 44.0, "heading": 105.0, "status": "ACTIVE"}, # Palladam Town
    {"id": "bus-007", "bus_number": "BUS-007", "route_name": "14C", "lat": 11.0450, "lng": 76.8520, "speed": 35.0, "heading": 285.0, "status": "ACTIVE"}, # Marudhamalai Foothills
    {"id": "bus-008", "bus_number": "BUS-008", "route_name": "21A", "lat": 11.0450, "lng": 77.0550, "speed": 38.0, "heading": 75.0, "status": "ACTIVE"}, # KMCH / Airport
    {"id": "bus-009", "bus_number": "BUS-009", "route_name": "70",  "lat": 11.0380, "lng": 76.9780, "speed": 32.0, "heading": 10.0, "status": "ACTIVE"}, # Ganapathy
    {"id": "bus-010", "bus_number": "BUS-010", "route_name": "45",  "lat": 11.0015, "lng": 77.0285, "speed": 36.0, "heading": 90.0, "status": "ACTIVE"}, # Singanallur
    {"id": "bus-011", "bus_number": "BUS-011", "route_name": "101", "lat": 11.1550, "lng": 76.9350, "speed": 48.0, "heading": 355.0, "status": "ACTIVE"}, # Periyanaickenpalayam
    {"id": "bus-012", "bus_number": "BUS-012", "route_name": "202", "lat": 11.1085, "lng": 77.3411, "speed": 40.0, "heading": 120.0, "status": "ACTIVE"}, # Tiruppur Bus Stand
    {"id": "bus-013", "bus_number": "BUS-013", "route_name": "303", "lat": 10.8210, "lng": 76.9850, "speed": 55.0, "heading": 170.0, "status": "ACTIVE"}, # Kinathukadavu
    {"id": "bus-014", "bus_number": "BUS-014", "route_name": "404", "lat": 11.3250, "lng": 77.0050, "speed": 41.0, "heading": 330.0, "status": "ACTIVE"}, # Sirumugai Transit Hub
    {"id": "bus-015", "bus_number": "BUS-015", "route_name": "505", "lat": 10.8050, "lng": 76.7550, "speed": 50.0, "heading": 240.0, "status": "ACTIVE"}, # Kanjikode
    {"id": "bus-016", "bus_number": "BUS-016", "route_name": "606", "lat": 11.0250, "lng": 77.1250, "speed": 46.0, "heading": 85.0, "status": "ACTIVE"}, # Sulur Air Force Base
    {"id": "bus-017", "bus_number": "BUS-017", "route_name": "14C", "lat": 11.0310, "lng": 76.8900, "speed": 34.0, "heading": 270.0, "status": "ACTIVE"}, # Vadavalli
    {"id": "bus-018", "bus_number": "BUS-018", "route_name": "21A", "lat": 11.0303, "lng": 77.0230, "speed": 36.0, "heading": 60.0, "status": "ACTIVE"}, # Coimbatore Airport
    {"id": "bus-019", "bus_number": "BUS-019", "route_name": "70",  "lat": 11.0290, "lng": 76.9550, "speed": 30.0, "heading": 340.0, "status": "ACTIVE"}, # Saibaba Colony
    {"id": "bus-020", "bus_number": "BUS-020", "route_name": "45",  "lat": 11.0010, "lng": 77.0120, "speed": 35.0, "heading": 260.0, "status": "ACTIVE"}, # Ramanathapuram
    {"id": "bus-021", "bus_number": "BUS-021", "route_name": "101", "lat": 11.2420, "lng": 76.9580, "speed": 47.0, "heading": 10.0, "status": "ACTIVE"}, # Karamadai Town
    {"id": "bus-022", "bus_number": "BUS-022", "route_name": "202", "lat": 11.1080, "lng": 77.1750, "speed": 53.0, "heading": 70.0, "status": "ACTIVE"}, # Karumathampatti
    {"id": "bus-023", "bus_number": "BUS-023", "route_name": "303", "lat": 10.6580, "lng": 77.0050, "speed": 25.0, "heading": 190.0, "status": "ACTIVE"}, # Pollachi Bus Stand
    {"id": "bus-024", "bus_number": "BUS-024", "route_name": "404", "lat": 11.0820, "lng": 76.9950, "speed": 39.0, "heading": 25.0, "status": "MAINTENANCE"}, # Saravanampatti IT Park
]

REGIONAL_SEED_EVENTS = [
    {
        "id": "evt-001",
        "bus_id": "bus-001",
        "event_type": "POTHOLE",
        "confidence": 0.94,
        "severity": "CRITICAL",
        "latitude": 11.3000,
        "longitude": 76.9500,
        "status": "NEW",
        "evidence_url": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/pothole_sample.jpg",
        "metadata_payload": {"bus_number": "BUS-001", "route_name": "101", "location_name": "Mettupalayam Main Road"},
    },
    {
        "id": "evt-002",
        "bus_id": "bus-002",
        "event_type": "TRAFFIC",
        "confidence": 0.89,
        "severity": "HIGH",
        "latitude": 11.1920,
        "longitude": 77.2680,
        "status": "NEW",
        "evidence_url": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/traffic_sample.jpg",
        "metadata_payload": {"bus_number": "BUS-002", "route_name": "202", "location_name": "Avinashi NH 544 Toll Plaza"},
    },
    {
        "id": "evt-003",
        "bus_id": "bus-003",
        "event_type": "ROAD_DAMAGE",
        "confidence": 0.91,
        "severity": "HIGH",
        "latitude": 10.7020,
        "longitude": 77.0080,
        "status": "NEW",
        "evidence_url": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/road_damage_sample.jpg",
        "metadata_payload": {"bus_number": "BUS-003", "route_name": "303", "location_name": "Achipatti - Pollachi Highway"},
    },
    {
        "id": "evt-004",
        "bus_id": "bus-005",
        "event_type": "TRAFFIC",
        "confidence": 0.95,
        "severity": "CRITICAL",
        "latitude": 10.8420,
        "longitude": 76.8200,
        "status": "NEW",
        "evidence_url": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/traffic_sample.jpg",
        "metadata_payload": {"bus_number": "BUS-005", "route_name": "505", "location_name": "Walayar Border Checkpoint"},
    },
    {
        "id": "evt-005",
        "bus_id": "bus-007",
        "event_type": "WATERLOGGING",
        "confidence": 0.88,
        "severity": "MEDIUM",
        "latitude": 11.0450,
        "longitude": 76.8520,
        "status": "NEW",
        "evidence_url": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/waterlogging_sample.jpg",
        "metadata_payload": {"bus_number": "BUS-007", "route_name": "14C", "location_name": "Marudhamalai Temple Foothills"},
    },
    {
        "id": "evt-006",
        "bus_id": "bus-006",
        "event_type": "POTHOLE",
        "confidence": 0.92,
        "severity": "HIGH",
        "latitude": 10.9980,
        "longitude": 77.2850,
        "status": "NEW",
        "evidence_url": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/pothole_sample.jpg",
        "metadata_payload": {"bus_number": "BUS-006", "route_name": "606", "location_name": "Palladam Central Junction"},
    },
]

def seed_regional_fleet(db: Session) -> None:
    """
    Ensures all 24 buses and initial defect events are mapped to the 
    50 km radius Coimbatore regional transport network (Mettupalayam, Tiruppur,
    Pollachi, Annur, Walayar, Palladam, Marudhamalai).
    """
    now = datetime.now(timezone.utc)
    for bdata in REGIONAL_SEED_BUSES:
        bus = db.query(Bus).filter(Bus.id == bdata["id"]).first()
        if not bus:
            bus = Bus(
                id=bdata["id"],
                bus_number=bdata["bus_number"],
                route_name=bdata["route_name"],
                status=bdata["status"],
                latitude=bdata["lat"],
                longitude=bdata["lng"],
                speed=bdata["speed"],
                heading=bdata["heading"],
                last_seen=now,
            )
            db.add(bus)
        else:
            bus.route_name = bdata["route_name"]
            bus.latitude = bdata["lat"]
            bus.longitude = bdata["lng"]
            bus.speed = bdata["speed"]
            bus.heading = bdata["heading"]
            bus.status = bdata["status"]
            bus.last_seen = now

    for edata in REGIONAL_SEED_EVENTS:
        event = db.query(Event).filter(Event.id == edata["id"]).first()
        if not event:
            event = Event(
                id=edata["id"],
                bus_id=edata["bus_id"],
                event_type=edata["event_type"],
                confidence=edata["confidence"],
                severity=edata["severity"],
                latitude=edata["latitude"],
                longitude=edata["longitude"],
                status=edata["status"],
                evidence_url=edata["evidence_url"],
                metadata_payload=edata["metadata_payload"],
                timestamp=now,
            )
            db.add(event)
        else:
            event.latitude = edata["latitude"]
            event.longitude = edata["longitude"]

    db.commit()
    logger.info("Successfully seeded 50km regional Coimbatore bus fleet & events.")
