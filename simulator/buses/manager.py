import random
from typing import List, Dict, Any, Tuple
from simulator.gps.interpolator import get_position_along_road_path

# High-density road polyline definitions for Coimbatore arterial corridors.
# Every point lies strictly on real Google Maps street geometries.
ROUTES: Dict[str, List[Tuple[float, float]]] = {
    "21A": [  # Gandhipuram - Avinashi Road - Airport (NH 544)
        (11.0183, 76.9725),
        (11.0160, 76.9735),
        (11.0135, 76.9762),
        (11.0134, 76.9865),
        (11.0150, 76.9920),
        (11.0170, 76.9975),
        (11.0210, 77.0020),
        (11.0270, 77.0080),
        (11.0290, 77.0160),
        (11.0303, 77.0230),
        (11.0300, 77.0320),
        (11.0295, 77.0410),
        # Loop return
        (11.0300, 77.0320),
        (11.0303, 77.0230),
        (11.0290, 77.0160),
        (11.0270, 77.0080),
        (11.0210, 77.0020),
        (11.0170, 76.9975),
        (11.0150, 76.9920),
        (11.0134, 76.9865),
        (11.0135, 76.9762),
        (11.0160, 76.9735),
        (11.0183, 76.9725),
    ],
    "14C": [  # Ukkadam - Town Hall - R.S. Puram - Saibaba Colony
        (10.9885, 76.9585),
        (10.9935, 76.9605),
        (10.9978, 76.9617),
        (11.0005, 76.9580),
        (11.0035, 76.9540),
        (11.0055, 76.9515),
        (11.0075, 76.9497),
        (11.0140, 76.9480),
        (11.0200, 76.9470),
        (11.0250, 76.9550),
        # Loop return
        (11.0200, 76.9470),
        (11.0140, 76.9480),
        (11.0075, 76.9497),
        (11.0055, 76.9515),
        (11.0035, 76.9540),
        (11.0005, 76.9580),
        (10.9978, 76.9617),
        (10.9935, 76.9605),
        (10.9885, 76.9585),
    ],
    "70": [  # 100 Feet Road Ring - Gandhipuram - Ramanathapuram - Sungam
        (11.0183, 76.9725),
        (11.0160, 76.9680),
        (11.0112, 76.9773),
        (11.0050, 76.9820),
        (11.0002, 76.9885),
        (10.9950, 76.9820),
        (10.9905, 76.9750),
        (10.9930, 76.9680),
        (10.9978, 76.9617),
        (11.0080, 76.9670),
        (11.0183, 76.9725),
    ],
    "3B": [  # Mettupalayam Road (NH 181) - Gandhipuram to Thudiyalur
        (11.0183, 76.9725),
        (11.0210, 76.9640),
        (11.0230, 76.9585),
        (11.0290, 76.9550),
        (11.0355, 76.9520),
        (11.0450, 76.9460),
        (11.0530, 76.9430),
        (11.0595, 76.9410),
        # Loop return
        (11.0530, 76.9430),
        (11.0450, 76.9460),
        (11.0355, 76.9520),
        (11.0290, 76.9550),
        (11.0230, 76.9585),
        (11.0210, 76.9640),
        (11.0183, 76.9725),
    ],
    "45": [  # Trichy Road (NH 83) - Singanallur - Sungam - Town Hall
        (11.0015, 77.0285),
        (11.0010, 77.0120),
        (11.0005, 77.0000),
        (11.0000, 76.9885),
        (10.9950, 76.9810),
        (10.9905, 76.9755),
        (10.9935, 76.9680),
        (10.9978, 76.9617),
        # Loop return
        (10.9935, 76.9680),
        (10.9905, 76.9755),
        (10.9950, 76.9810),
        (11.0000, 76.9885),
        (11.0005, 77.0000),
        (11.0010, 77.0120),
        (11.0015, 77.0285),
    ],
    "S7": [  # Palakkad Road (NH 544) - Kuniyamuthur - Ukkadam - Gandhipuram
        (10.9525, 76.9470),
        (10.9580, 76.9500),
        (10.9635, 76.9540),
        (10.9720, 76.9555),
        (10.9780, 76.9565),
        (10.9885, 76.9585),
        (10.9935, 76.9605),
        (10.9978, 76.9617),
        (11.0080, 76.9670),
        (11.0183, 76.9725),
        # Loop return
        (11.0080, 76.9670),
        (10.9978, 76.9617),
        (10.9935, 76.9605),
        (10.9885, 76.9585),
        (10.9780, 76.9565),
        (10.9720, 76.9555),
        (10.9635, 76.9540),
        (10.9580, 76.9500),
        (10.9525, 76.9470),
    ],
}

# Fixed road faults along the street coordinates
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
        # Initial distance offset along path
        self.distance_traveled = random.uniform(0.0, 5000.0)
        self.speed = random.uniform(22.0, 45.0)  # km/h
        self.status = "ACTIVE"
        self.dwell_steps = 0          # stopped at bus stop
        self.signal_lost_steps = 0    # telemetry link down

        # Set initial snapped position on road
        self.lat, self.lon, self.heading, _ = get_position_along_road_path(
            self.waypoints, self.distance_traveled
        )

    @property
    def is_transmitting(self) -> bool:
        return self.signal_lost_steps <= 0

    def _update_link(self):
        if self.signal_lost_steps > 0:
            self.signal_lost_steps -= 1
        elif random.random() < 0.004:
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

    def step(self, time_step_seconds: float = 2.0):
        self._update_link()
        if self.status == "MAINTENANCE":
            self.speed = 0.0
            return
        if self._update_dwell():
            return

        # Speed variation in km/h -> convert to meters per second
        self.speed = max(10.0, min(55.0, self.speed + random.uniform(-3.0, 3.0)))
        speed_m_per_s = (self.speed * 1000.0) / 3600.0
        
        # Advance distance strictly along the road polyline
        distance_step_meters = speed_m_per_s * time_step_seconds
        self.distance_traveled += distance_step_meters

        # Compute position strictly snapped to Google Maps road polyline
        self.lat, self.lon, self.heading, _ = get_position_along_road_path(
            self.waypoints, self.distance_traveled
        )

    def nearby_hotspot(self) -> Dict[str, Any]:
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
        if i % 12 == 0:
            bus.status = "MAINTENANCE"
        buses.append(bus)
    return buses

def create_10_simulated_buses() -> List[SimulatedBus]:
    return create_simulated_fleet(10)
