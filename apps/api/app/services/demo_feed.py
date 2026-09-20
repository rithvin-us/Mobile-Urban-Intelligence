"""
In-process telemetry feed for demonstrations.

The bus fleet normally reports from the edge devices, and during development
from the simulator process. Neither is running when nobody is at a laptop, so a
deployed demo goes dark within thirty seconds. With DEMO_MODE enabled this
module drives the same fleet from inside the API container: same routes, same
event contract, written through the ordinary service layer.

It is off unless DEMO_MODE is set, so tests, CI and real deployments are
untouched. Route geometry is duplicated from simulator/buses/manager.py because
the Docker build context is apps/api and cannot reach the simulator package.
"""

import logging
import math
import os
import random
import threading
from typing import Any, Dict, List, Tuple

from app.core.database import SessionLocal
from app.models.event import Event
from app.schemas.bus import BusTelemetryUpdate
from app.schemas.event import EventCreate
from app.services import bus_service, event_service

logger = logging.getLogger(__name__)

STEP_SECONDS = float(os.getenv("DEMO_STEP_SECONDS", "3"))
FLEET_SIZE = int(os.getenv("DEMO_FLEET_SIZE", "24"))
EVENT_CAP = int(os.getenv("DEMO_EVENT_CAP", "4000"))

# The ten regional corridors, generated from apps/web/lib/routes.ts so the
# fleet runs on exactly the geometry the map draws. A bus on a route the
# dashboard does not know about cannot be road-snapped and reads as drifting.
ROUTES: Dict[str, List[Tuple[float, float]]] = {
    "101": [
        (11.0183, 76.9725), (11.0290, 76.9550), (11.0450, 76.9460),
        (11.0780, 76.9380), (11.1550, 76.9350), (11.2420, 76.9580),
        (11.3000, 76.9500), (11.3450, 76.9280), (11.3000, 76.9500),
        (11.2420, 76.9580), (11.1550, 76.9350), (11.0780, 76.9380),
        (11.0450, 76.9460), (11.0290, 76.9550), (11.0183, 76.9725),
    ],
    "202": [
        (11.0183, 76.9725), (11.0300, 77.0320), (11.0650, 77.0850),
        (11.1080, 77.1750), (11.1920, 77.2680), (11.1085, 77.3411),
        (11.1920, 77.2680), (11.1080, 77.1750), (11.0650, 77.0850),
        (11.0300, 77.0320), (11.0183, 76.9725),
    ],
    "303": [
        (10.9885, 76.9585), (10.9230, 76.9680), (10.8800, 76.9750),
        (10.8210, 76.9850), (10.7020, 77.0080), (10.6580, 77.0050),
        (10.7020, 77.0080), (10.8210, 76.9850), (10.8800, 76.9750),
        (10.9230, 76.9680), (10.9885, 76.9585),
    ],
    "404": [
        (11.0183, 76.9725), (11.0380, 76.9780), (11.0820, 76.9950),
        (11.1650, 77.0420), (11.2320, 77.1050), (11.3250, 77.0050),
        (11.2320, 77.1050), (11.1650, 77.0420), (11.0820, 76.9950),
        (11.0380, 76.9780), (11.0183, 76.9725),
    ],
    "505": [
        (10.9885, 76.9585), (10.9580, 76.9500), (10.9150, 76.9120),
        (10.8750, 76.8580), (10.8420, 76.8200), (10.8050, 76.7550),
        (10.8420, 76.8200), (10.8750, 76.8580), (10.9150, 76.9120),
        (10.9580, 76.9500), (10.9885, 76.9585),
    ],
    "606": [
        (11.0015, 77.0285), (11.0030, 77.0520), (11.0250, 77.1250),
        (11.0150, 77.2100), (10.9980, 77.2850), (11.0150, 77.2100),
        (11.0250, 77.1250), (11.0030, 77.0520), (11.0015, 77.0285),
    ],
    "14C": [
        (10.9885, 76.9585), (10.9978, 76.9617), (11.0055, 76.9515),
        (11.0180, 76.9200), (11.0310, 76.8900), (11.0450, 76.8520),
        (11.0310, 76.8900), (11.0180, 76.9200), (11.0055, 76.9515),
        (10.9978, 76.9617), (10.9885, 76.9585),
    ],
    "21A": [
        (11.0183, 76.9725), (11.0134, 76.9865), (11.0170, 76.9975),
        (11.0270, 77.0080), (11.0290, 77.0160), (11.0303, 77.0230),
        (11.0450, 77.0550), (11.0303, 77.0230), (11.0290, 77.0160),
        (11.0270, 77.0080), (11.0170, 76.9975), (11.0134, 76.9865),
        (11.0183, 76.9725),
    ],
    "70": [
        (11.0183, 76.9725), (11.0160, 76.9680), (11.0290, 76.9550),
        (11.0380, 76.9780), (11.0002, 76.9885), (10.9950, 76.9820),
        (10.9885, 76.9585), (11.0183, 76.9725),
    ],
    "45": [
        (11.0015, 77.0285), (11.0010, 77.0120), (11.0000, 76.9885),
        (10.9950, 76.9810), (10.9978, 76.9617), (10.9950, 76.9810),
        (11.0000, 76.9885), (11.0010, 77.0120), (11.0015, 77.0285),
    ],
}

# Fixed road faults: every bus passing one can report it, which is what makes a
# defect show several sightings from different buses.
HOTSPOTS: Dict[str, List[Dict[str, Any]]] = {
    "101": [
        {"lat": 11.078, "lon": 76.938, "type": "POTHOLE", "severity": "CRITICAL"},
        {"lat": 11.242, "lon": 76.958, "type": "ROAD_DAMAGE", "severity": "HIGH"},
        {"lat": 11.029, "lon": 76.955, "type": "TRAFFIC", "severity": "MEDIUM"},
    ],
    "202": [
        {"lat": 11.065, "lon": 77.085, "type": "WATERLOGGING", "severity": "HIGH"},
        {"lat": 11.108, "lon": 77.175, "type": "POTHOLE", "severity": "HIGH"},
        {"lat": 11.192, "lon": 77.268, "type": "TRAFFIC", "severity": "CRITICAL"},
    ],
    "303": [
        {"lat": 10.88, "lon": 76.975, "type": "ROAD_DAMAGE", "severity": "MEDIUM"},
        {"lat": 10.702, "lon": 77.008, "type": "PEDESTRIAN_RISK", "severity": "HIGH"},
    ],
    "404": [
        {"lat": 11.082, "lon": 76.995, "type": "ZEBRA_CROSSING", "severity": "LOW"},
        {"lat": 11.232, "lon": 77.105, "type": "POTHOLE", "severity": "MEDIUM"},
    ],
    "505": [
        {"lat": 10.875, "lon": 76.858, "type": "WATERLOGGING", "severity": "CRITICAL"},
        {"lat": 10.842, "lon": 76.82, "type": "TRAFFIC_SIGN", "severity": "LOW"},
    ],
    "606": [
        {"lat": 11.025, "lon": 77.125, "type": "INCIDENT", "severity": "HIGH"},
        {"lat": 11.015, "lon": 77.21, "type": "ROAD_DAMAGE", "severity": "HIGH"},
    ],
    "14C": [
        {"lat": 11.0055, "lon": 76.9515, "type": "POTHOLE", "severity": "HIGH"},
        {"lat": 11.031, "lon": 76.89, "type": "WATERLOGGING", "severity": "MEDIUM"},
    ],
    "21A": [
        {"lat": 11.017, "lon": 76.9975, "type": "TRAFFIC", "severity": "HIGH"},
        {"lat": 11.029, "lon": 77.016, "type": "POTHOLE", "severity": "CRITICAL"},
    ],
    "70": [
        {"lat": 11.016, "lon": 76.968, "type": "WATERLOGGING", "severity": "MEDIUM"},
        {"lat": 11.038, "lon": 76.978, "type": "ROAD_DAMAGE", "severity": "MEDIUM"},
    ],
    "45": [
        {"lat": 11.001, "lon": 77.012, "type": "POTHOLE", "severity": "CRITICAL"},
        {"lat": 10.995, "lon": 76.981, "type": "TRAFFIC", "severity": "MEDIUM"},
    ],
}

HOTSPOT_RADIUS_DEG = 0.0060  # roughly 650 m, sized for the regional corridors
HOTSPOT_REPORT_CHANCE = 0.35
OPPORTUNISTIC_CHANCE = 0.04

OPPORTUNISTIC_TYPES = [
    ("POTHOLE", 26), ("ROAD_DAMAGE", 18), ("TRAFFIC", 20), ("WATERLOGGING", 8),
    ("TRAFFIC_SIGN", 9), ("ZEBRA_CROSSING", 7), ("PEDESTRIAN_RISK", 8), ("INCIDENT", 4),
]

# Served by the dashboard out of apps/web/public/evidence. The Cloud Storage
# bucket these used to point at was deleted and every link 404s, which is why
# the evidence popup fell back to a placeholder for every detection.
EVIDENCE = {
    "POTHOLE": "/evidence/pothole_sample.jpg",
    "ROAD_DAMAGE": "/evidence/road_damage_sample.jpg",
    "WATERLOGGING": "/evidence/waterlogging_sample.jpg",
    "TRAFFIC": "/evidence/traffic_sample.jpg",
    "INCIDENT": "/evidence/incident_sample.jpg",
}
DEFAULT_EVIDENCE = "/evidence/default_sample.jpg"


def _heading(start: Tuple[float, float], end: Tuple[float, float]) -> float:
    d_lon = math.radians(end[1] - start[1])
    lat1, lat2 = math.radians(start[0]), math.radians(end[0])
    y = math.sin(d_lon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lon)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


class _Bus:
    def __init__(self, index: int, route_name: str):
        self.bus_id = f"bus-{index:03d}"
        self.bus_number = f"BUS-{index:03d}"
        self.route_name = route_name
        self.waypoints = ROUTES[route_name]
        self.leg = random.randrange(len(self.waypoints))
        self.progress = random.random()
        self.lat, self.lon = self.waypoints[self.leg]
        self.heading = 0.0
        self.speed = random.uniform(18.0, 42.0)
        self.status = "MAINTENANCE" if index % 12 == 0 else "ACTIVE"
        self.dwell = 0

    def step(self) -> None:
        if self.status == "MAINTENANCE":
            self.speed = 0.0
            return
        if self.dwell > 0:
            self.dwell -= 1
            self.speed = 0.0
            return
        if random.random() < 0.05:
            self.dwell = random.randint(2, 5)
            self.speed = 0.0
            return

        self.progress += random.uniform(0.04, 0.10)
        if self.progress >= 1.0:
            self.progress = 0.0
            self.leg = (self.leg + 1) % len(self.waypoints)

        start = self.waypoints[self.leg]
        end = self.waypoints[(self.leg + 1) % len(self.waypoints)]
        self.lat = start[0] + (end[0] - start[0]) * self.progress
        self.lon = start[1] + (end[1] - start[1]) * self.progress
        self.heading = _heading(start, end)
        self.speed = max(8.0, min(58.0, self.speed + random.uniform(-4.0, 4.0)))

    def hotspot(self) -> Dict[str, Any]:
        for spot in HOTSPOTS.get(self.route_name, []):
            if (abs(spot["lat"] - self.lat) < HOTSPOT_RADIUS_DEG
                    and abs(spot["lon"] - self.lon) < HOTSPOT_RADIUS_DEG):
                return spot
        return {}


def _build_fleet() -> List[_Bus]:
    route_keys = list(ROUTES)
    return [_Bus(i, route_keys[(i - 1) % len(route_keys)]) for i in range(1, FLEET_SIZE + 1)]


def _prune(db) -> None:
    """Keeps the demo database from growing without bound on a small plan."""
    total = db.query(Event).count()
    if total <= EVENT_CAP:
        return
    stale = (
        db.query(Event.id)
        .order_by(Event.timestamp.asc())
        .limit(total - EVENT_CAP)
        .all()
    )
    db.query(Event).filter(Event.id.in_([row[0] for row in stale])).delete(synchronize_session=False)
    db.commit()


def _run(stop: threading.Event) -> None:
    fleet = _build_fleet()
    steps = 0
    logger.info("Demo feed started: %d buses, %.1fs per step", len(fleet), STEP_SECONDS)

    while not stop.is_set():
        steps += 1
        db = SessionLocal()
        try:
            for bus in fleet:
                bus.step()
                bus_service.update_or_create_telemetry(
                    db,
                    BusTelemetryUpdate(
                        bus_id=bus.bus_id,
                        bus_number=bus.bus_number,
                        route_name=bus.route_name,
                        latitude=round(bus.lat, 6),
                        longitude=round(bus.lon, 6),
                        heading=round(bus.heading, 1),
                        speed=round(bus.speed, 1),
                        status=bus.status,
                    ),
                )

                if bus.status == "MAINTENANCE":
                    continue

                spot = bus.hotspot() if random.random() < HOTSPOT_REPORT_CHANCE else {}
                if spot:
                    event_type = spot["type"]
                    severity = spot["severity"]
                    lat = spot["lat"] + random.uniform(-0.00008, 0.00008)
                    lon = spot["lon"] + random.uniform(-0.00008, 0.00008)
                elif random.random() < OPPORTUNISTIC_CHANCE:
                    names = [name for name, _ in OPPORTUNISTIC_TYPES]
                    weights = [weight for _, weight in OPPORTUNISTIC_TYPES]
                    event_type = random.choices(names, weights=weights, k=1)[0]
                    severity = random.choices(
                        ["LOW", "MEDIUM", "HIGH", "CRITICAL"], weights=[34, 38, 20, 8], k=1
                    )[0]
                    lat = bus.lat + random.uniform(-0.0003, 0.0003)
                    lon = bus.lon + random.uniform(-0.0003, 0.0003)
                else:
                    continue

                event_service.create_event(
                    db,
                    EventCreate(
                        bus_id=bus.bus_id,
                        event_type=event_type,
                        confidence=round(random.uniform(0.71, 0.98), 2),
                        severity=severity,
                        latitude=round(lat, 6),
                        longitude=round(lon, 6),
                        status="NEW",
                        evidence_url=EVIDENCE.get(event_type, DEFAULT_EVIDENCE),
                        metadata={
                            "bus_number": bus.bus_number,
                            "route_name": bus.route_name,
                            "speed_kmph": round(bus.speed, 1),
                            "detection_source": "DEMO_FEED",
                        },
                    ),
                )

            if steps % 40 == 0:
                _prune(db)
        except Exception as exc:
            logger.warning("Demo feed step failed: %s", exc)
        finally:
            db.close()

        stop.wait(STEP_SECONDS)

    logger.info("Demo feed stopped after %d steps", steps)


_stop_event = threading.Event()
_thread: threading.Thread | None = None


def enabled() -> bool:
    return os.getenv("DEMO_MODE", "").strip().lower() in {"1", "true", "yes", "on"}


def start() -> None:
    """Starts the feed once, if DEMO_MODE is enabled."""
    global _thread
    if not enabled() or _thread is not None:
        return
    _stop_event.clear()
    _thread = threading.Thread(target=_run, args=(_stop_event,), name="demo-feed", daemon=True)
    _thread.start()


def stop() -> None:
    global _thread
    if _thread is None:
        return
    _stop_event.set()
    _thread.join(timeout=5)
    _thread = None
