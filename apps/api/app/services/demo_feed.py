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

# Coimbatore corridors, matching the simulator's routes.
ROUTES: Dict[str, List[Tuple[float, float]]] = {
    "21A": [
        (11.0183, 76.9725), (11.0135, 76.9762), (11.0134, 76.9865),
        (11.0170, 76.9975), (11.0270, 77.0080), (11.0303, 77.0230),
        (11.0295, 77.0410), (11.0303, 77.0230), (11.0270, 77.0080),
        (11.0170, 76.9975), (11.0134, 76.9865), (11.0135, 76.9762),
    ],
    "14C": [
        (10.9885, 76.9585), (10.9978, 76.9617), (11.0035, 76.9540),
        (11.0075, 76.9497), (11.0200, 76.9470), (11.0075, 76.9497),
        (11.0035, 76.9540), (10.9978, 76.9617),
    ],
    "70": [
        (11.0183, 76.9725), (11.0112, 76.9773), (11.0002, 76.9885),
        (10.9905, 76.9750), (10.9978, 76.9617),
    ],
    "3B": [
        (11.0183, 76.9725), (11.0230, 76.9585), (11.0355, 76.9520),
        (11.0595, 76.9410), (11.0355, 76.9520), (11.0230, 76.9585),
    ],
    "45": [
        (11.0015, 77.0285), (11.0000, 76.9885), (10.9905, 76.9755),
        (10.9978, 76.9617), (10.9905, 76.9755), (11.0000, 76.9885),
    ],
    "S7": [
        (10.9525, 76.9470), (10.9635, 76.9540), (10.9885, 76.9585),
        (10.9978, 76.9617), (11.0183, 76.9725), (10.9978, 76.9617),
        (10.9885, 76.9585), (10.9635, 76.9540),
    ],
}

# Fixed road faults: every bus passing one can report it, which is what makes a
# defect show several sightings from different buses.
HOTSPOTS: Dict[str, List[Dict[str, Any]]] = {
    "21A": [
        {"lat": 11.0134, "lon": 76.9865, "type": "POTHOLE", "severity": "HIGH"},
        {"lat": 11.0270, "lon": 77.0080, "type": "TRAFFIC", "severity": "MEDIUM"},
        {"lat": 11.0303, "lon": 77.0230, "type": "ZEBRA_CROSSING", "severity": "LOW"},
    ],
    "14C": [
        {"lat": 11.0035, "lon": 76.9540, "type": "WATERLOGGING", "severity": "HIGH"},
        {"lat": 11.0200, "lon": 76.9470, "type": "ROAD_DAMAGE", "severity": "MEDIUM"},
    ],
    "70": [
        {"lat": 11.0112, "lon": 76.9773, "type": "TRAFFIC", "severity": "HIGH"},
        {"lat": 11.0002, "lon": 76.9885, "type": "POTHOLE", "severity": "CRITICAL"},
        {"lat": 10.9905, "lon": 76.9750, "type": "TRAFFIC_SIGN", "severity": "LOW"},
    ],
    "3B": [
        {"lat": 11.0355, "lon": 76.9520, "type": "ROAD_DAMAGE", "severity": "HIGH"},
        {"lat": 11.0230, "lon": 76.9585, "type": "PEDESTRIAN_RISK", "severity": "MEDIUM"},
    ],
    "45": [
        {"lat": 11.0000, "lon": 76.9885, "type": "POTHOLE", "severity": "MEDIUM"},
        {"lat": 10.9905, "lon": 76.9755, "type": "WATERLOGGING", "severity": "MEDIUM"},
    ],
    "S7": [
        {"lat": 10.9885, "lon": 76.9585, "type": "TRAFFIC", "severity": "HIGH"},
        {"lat": 10.9635, "lon": 76.9540, "type": "ZEBRA_CROSSING", "severity": "LOW"},
    ],
}

HOTSPOT_RADIUS_DEG = 0.0012  # roughly 130 m
HOTSPOT_REPORT_CHANCE = 0.35
OPPORTUNISTIC_CHANCE = 0.04

OPPORTUNISTIC_TYPES = [
    ("POTHOLE", 26), ("ROAD_DAMAGE", 18), ("TRAFFIC", 20), ("WATERLOGGING", 8),
    ("TRAFFIC_SIGN", 9), ("ZEBRA_CROSSING", 7), ("PEDESTRIAN_RISK", 8), ("INCIDENT", 4),
]

EVIDENCE = {
    "POTHOLE": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/pothole_sample.jpg",
    "ROAD_DAMAGE": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/road_damage_sample.jpg",
    "WATERLOGGING": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/waterlogging_sample.jpg",
    "INCIDENT": "https://storage.googleapis.com/sih26124-urban-sensing/evidence/incident_sample.jpg",
}
DEFAULT_EVIDENCE = "https://storage.googleapis.com/sih26124-urban-sensing/evidence/default_sample.jpg"


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
