import random
from typing import List, Dict, Any, Tuple

from simulator.gps.interpolator import calculate_heading, interpolate_position

# Coimbatore city bus corridors. Waypoints follow the real arterial roads the
# routes run on, so detections land on plausible street addresses.
ROUTES: Dict[str, List[Tuple[float, float]]] = {
    "21A": [  # Gandhipuram - Avinashi Road - Airport
        (11.0183, 76.9725),
        (11.0135, 76.9762),
        (11.0134, 76.9865),
        (11.0170, 76.9975),
        (11.0270, 77.0080),
        (11.0303, 77.0230),
        (11.0295, 77.0410),
        (11.0303, 77.0230),
        (11.0270, 77.0080),
        (11.0170, 76.9975),
        (11.0134, 76.9865),
        (11.0135, 76.9762),
    ],
    "14C": [  # Ukkadam - Town Hall - R.S. Puram - Saibaba Colony
        (10.9885, 76.9585),
        (10.9978, 76.9617),
        (11.0035, 76.9540),
        (11.0075, 76.9497),
        (11.0200, 76.9470),
        (11.0075, 76.9497),
        (11.0035, 76.9540),
        (10.9978, 76.9617),
    ],
    "70": [  # 100 Feet Road ring - Gandhipuram - Ramanathapuram - Sungam
        (11.0183, 76.9725),
        (11.0112, 76.9773),
        (11.0002, 76.9885),
        (10.9905, 76.9750),
        (10.9978, 76.9617),
    ],
    "3B": [  # Mettupalayam Road - Gandhipuram to Thudiyalur
        (11.0183, 76.9725),
        (11.0230, 76.9585),
        (11.0355, 76.9520),
        (11.0595, 76.9410),
        (11.0355, 76.9520),
        (11.0230, 76.9585),
    ],
    "45": [  # Trichy Road - Singanallur - Sungam - Town Hall
        (11.0015, 77.0285),
        (11.0000, 76.9885),
        (10.9905, 76.9755),
        (10.9978, 76.9617),
        (10.9905, 76.9755),
        (11.0000, 76.9885),
    ],
    "S7": [  # Kuniyamuthur - Ukkadam - Gandhipuram
        (10.9525, 76.9470),
        (10.9635, 76.9540),
        (10.9885, 76.9585),
        (10.9978, 76.9617),
        (11.0183, 76.9725),
        (10.9978, 76.9617),
        (10.9885, 76.9585),
        (10.9635, 76.9540),
    ],
}

# Fixed road faults on each corridor. Every bus that passes one can report it,
# which is what produces repeat sightings of a single defect.
ROUTE_HOTSPOTS: Dict[str, List[Dict[str, Any]]] = {
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


class SimulatedBus:
    def __init__(self, bus_id: str, bus_number: str, route_name: str, route_waypoints: List[tuple]):
        self.bus_id = bus_id
        self.bus_number = bus_number
        self.route_name = route_name
        self.waypoints = route_waypoints
        self.current_waypoint_idx = random.randrange(len(route_waypoints))
        self.progress = random.random()
        self.lat, self.lon = self.waypoints[self.current_waypoint_idx]
        self.heading = 0.0
        self.speed = random.uniform(18.0, 42.0)
        self.status = "ACTIVE"
        self.dwell_steps = 0          # stopped at a halt
        self.signal_lost_steps = 0    # telemetry link down

    # --- link + halt behaviour -------------------------------------------------
    @property
    def is_transmitting(self) -> bool:
        return self.signal_lost_steps <= 0

    def _update_link(self):
        if self.signal_lost_steps > 0:
            self.signal_lost_steps -= 1
        elif random.random() < 0.004:
            # Occasional dead zone, so the fleet panel shows real offline buses.
            self.signal_lost_steps = random.randint(20, 45)

    def _update_dwell(self):
        if self.dwell_steps > 0:
            self.dwell_steps -= 1
            self.speed = 0.0
            return True
        if random.random() < 0.05:
            self.dwell_steps = random.randint(2, 6)
            self.speed = 0.0
            return True
        return False

    def step(self):
        self._update_link()
        if self.status == "MAINTENANCE":
            self.speed = 0.0
            return
        if self._update_dwell():
            return

        step_increment = random.uniform(0.04, 0.10)
        self.progress += step_increment

        next_idx = (self.current_waypoint_idx + 1) % len(self.waypoints)
        start_pt = self.waypoints[self.current_waypoint_idx]
        end_pt = self.waypoints[next_idx]

        if self.progress >= 1.0:
            self.progress = 0.0
            self.current_waypoint_idx = next_idx
            next_idx = (self.current_waypoint_idx + 1) % len(self.waypoints)
            start_pt = self.waypoints[self.current_waypoint_idx]
            end_pt = self.waypoints[next_idx]

        self.lat, self.lon = interpolate_position(start_pt, end_pt, self.progress)
        self.heading = calculate_heading(start_pt[0], start_pt[1], end_pt[0], end_pt[1])
        self.speed = max(8.0, min(58.0, self.speed + random.uniform(-4.0, 4.0)))

    def nearby_hotspot(self) -> Dict[str, Any]:
        """The fixed road fault this bus is currently passing, if any."""
        for hotspot in ROUTE_HOTSPOTS.get(self.route_name, []):
            if (
                abs(hotspot["lat"] - self.lat) < HOTSPOT_RADIUS_DEG
                and abs(hotspot["lon"] - self.lon) < HOTSPOT_RADIUS_DEG
            ):
                return hotspot
        return {}

    def to_telemetry_payload(self) -> Dict[str, Any]:
        return {
            "bus_id": self.bus_id,
            "bus_number": self.bus_number,
            "route_name": self.route_name,
            "latitude": round(self.lat, 6),
            "longitude": round(self.lon, 6),
            "heading": round(self.heading, 1),
            "speed": round(self.speed, 1),
            "status": self.status,
        }


def create_simulated_fleet(fleet_size: int = 24) -> List[SimulatedBus]:
    buses = []
    route_keys = list(ROUTES.keys())
    for i in range(1, fleet_size + 1):
        bus_id = f"bus-{i:03d}"
        bus_number = f"BUS-{i:03d}"
        route_name = route_keys[(i - 1) % len(route_keys)]
        bus = SimulatedBus(bus_id, bus_number, route_name, ROUTES[route_name])
        # A couple of vehicles sit in the depot for servicing.
        if i % 12 == 0:
            bus.status = "MAINTENANCE"
        buses.append(bus)
    return buses


# Kept so existing callers keep working.
def create_10_simulated_buses() -> List[SimulatedBus]:
    return create_simulated_fleet(10)
