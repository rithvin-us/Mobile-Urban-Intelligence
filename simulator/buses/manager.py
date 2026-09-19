import random
from typing import List, Dict, Any, Tuple
from simulator.gps.interpolator import get_position_along_road_path

# High-density road polyline definitions for the 50 km radius Coimbatore regional transport network.
# Every point lies strictly on real Google Maps street geometries.
ROUTES: Dict[str, List[Tuple[float, float]]] = {
    "101": [  # Mettupalayam - Nilgiri Foothills Express (NH 181) ~45 km North
        (11.0183, 76.9725),
        (11.0290, 76.9550),
        (11.0450, 76.9460),
        (11.0780, 76.9380),
        (11.1550, 76.9350),
        (11.2420, 76.9580),
        (11.3000, 76.9500),
        (11.3450, 76.9280),
        # Loop return
        (11.3000, 76.9500),
        (11.2420, 76.9580),
        (11.1550, 76.9350),
        (11.0780, 76.9380),
        (11.0450, 76.9460),
        (11.0290, 76.9550),
        (11.0183, 76.9725),
    ],
    "202": [  # Tiruppur - Avinashi Regional Highway (NH 544) ~50 km East-Northeast
        (11.0183, 76.9725),
        (11.0300, 77.0320),
        (11.0650, 77.0850),
        (11.1080, 77.1750),
        (11.1920, 77.2680),
        (11.1085, 77.3411),
        # Loop return
        (11.1920, 77.2680),
        (11.1080, 77.1750),
        (11.0650, 77.0850),
        (11.0300, 77.0320),
        (11.0183, 76.9725),
    ],
    "303": [  # Kinathukadavu - Pollachi Trunk Corridor (NH 83) ~45 km South
        (10.9885, 76.9585),
        (10.9230, 76.9680),
        (10.8800, 76.9750),
        (10.8210, 76.9850),
        (10.7020, 77.0080),
        (10.6580, 77.0050),
        # Loop return
        (10.7020, 77.0080),
        (10.8210, 76.9850),
        (10.8800, 76.9750),
        (10.9230, 76.9680),
        (10.9885, 76.9585),
    ],
    "404": [  # Saravanampatti - Annur - Sirumugai Line (SH 165) ~40 km North-East
        (11.0183, 76.9725),
        (11.0380, 76.9780),
        (11.0820, 76.9950),
        (11.1650, 77.0420),
        (11.2320, 77.1050),
        (11.3250, 77.0050),
        # Loop return
        (11.2320, 77.1050),
        (11.1650, 77.0420),
        (11.0820, 76.9950),
        (11.0380, 76.9780),
        (11.0183, 76.9725),
    ],
    "505": [  # Walayar - Palakkad Interstate Transit (NH 544 West) ~45 km South-West
        (10.9885, 76.9585),
        (10.9580, 76.9500),
        (10.9150, 76.9120),
        (10.8750, 76.8580),
        (10.8420, 76.8200),
        (10.8050, 76.7550),
        # Loop return
        (10.8420, 76.8200),
        (10.8750, 76.8580),
        (10.9150, 76.9120),
        (10.9580, 76.9500),
        (10.9885, 76.9585),
    ],
    "606": [  # Sulur Airbase - Palladam Belt (NH 81) ~42 km East-South-East
        (11.0015, 77.0285),
        (11.0030, 77.0520),
        (11.0250, 77.1250),
        (11.0150, 77.2100),
        (10.9980, 77.2850),
        # Loop return
        (11.0150, 77.2100),
        (11.0250, 77.1250),
        (11.0030, 77.0520),
        (11.0015, 77.0285),
    ],
    "14C": [  # Town Hall - R.S. Puram - Marudhamalai Foothills ~15 km West
        (10.9885, 76.9585),
        (10.9978, 76.9617),
        (11.0055, 76.9515),
        (11.0180, 76.9200),
        (11.0310, 76.8900),
        (11.0450, 76.8520),
        # Loop return
        (11.0310, 76.8900),
        (11.0180, 76.9200),
        (11.0055, 76.9515),
        (10.9978, 76.9617),
        (10.9885, 76.9585),
    ],
    "21A": [  # Gandhipuram - Avinashi Road - Airport - KMCH
        (11.0183, 76.9725),
        (11.0134, 76.9865),
        (11.0170, 76.9975),
        (11.0270, 77.0080),
        (11.0290, 77.0160),
        (11.0303, 77.0230),
        (11.0450, 77.0550),
        # Loop return
        (11.0303, 77.0230),
        (11.0290, 77.0160),
        (11.0270, 77.0080),
        (11.0170, 76.9975),
        (11.0134, 76.9865),
        (11.0183, 76.9725),
    ],
    "70": [  # Coimbatore Ring Corridor - Ganapathy - Ramanathapuram
        (11.0183, 76.9725),
        (11.0160, 76.9680),
        (11.0290, 76.9550),
        (11.0380, 76.9780),
        (11.0002, 76.9885),
        (10.9950, 76.9820),
        (10.9885, 76.9585),
        (11.0183, 76.9725),
    ],
    "45": [  # Trichy Road Expressway - Singanallur - Town Hall
        (11.0015, 77.0285),
        (11.0010, 77.0120),
        (11.0000, 76.9885),
        (10.9950, 76.9810),
        (10.9978, 76.9617),
        # Loop return
        (10.9950, 76.9810),
        (11.0000, 76.9885),
        (11.0010, 77.0120),
        (11.0015, 77.0285),
    ],
}

# Fixed road faults along regional highway coordinates
ROUTE_HOTSPOTS: Dict[str, List[Dict[str, Any]]] = {
    "101": [
        {"lat": 11.2420, "lon": 76.9580, "type": "ROAD_DAMAGE", "severity": "HIGH"},
        {"lat": 11.3000, "lon": 76.9500, "type": "POTHOLE", "severity": "CRITICAL"},
    ],
    "202": [
        {"lat": 11.1080, "lon": 77.1750, "type": "TRAFFIC", "severity": "HIGH"},
        {"lat": 11.1920, "lon": 77.2680, "type": "ZEBRA_CROSSING", "severity": "LOW"},
    ],
    "303": [
        {"lat": 10.8210, "lon": 76.9850, "type": "ROAD_DAMAGE", "severity": "MEDIUM"},
        {"lat": 10.6580, "lon": 77.0050, "type": "POTHOLE", "severity": "HIGH"},
    ],
    "404": [
        {"lat": 11.0820, "lon": 76.9950, "type": "TRAFFIC", "severity": "HIGH"},
        {"lat": 11.2320, "lon": 77.1050, "type": "WATERLOGGING", "severity": "MEDIUM"},
    ],
    "505": [
        {"lat": 10.8750, "lon": 76.8580, "type": "TRAFFIC", "severity": "HIGH"},
        {"lat": 10.8420, "lon": 76.8200, "type": "POTHOLE", "severity": "CRITICAL"},
    ],
    "606": [
        {"lat": 11.0250, "lon": 77.1250, "type": "PEDESTRIAN_RISK", "severity": "MEDIUM"},
        {"lat": 10.9980, "lon": 77.2850, "type": "POTHOLE", "severity": "HIGH"},
    ],
    "14C": [
        {"lat": 11.0450, "lon": 76.8520, "type": "WATERLOGGING", "severity": "HIGH"},
        {"lat": 11.0055, "lon": 76.9515, "type": "POTHOLE", "severity": "MEDIUM"},
    ],
    "21A": [
        {"lat": 11.0134, "lon": 76.9865, "type": "POTHOLE", "severity": "HIGH"},
        {"lat": 11.0303, "lon": 77.0230, "type": "TRAFFIC", "severity": "MEDIUM"},
    ],
    "70": [
        {"lat": 11.0160, "lon": 76.9680, "type": "POTHOLE", "severity": "CRITICAL"},
        {"lat": 11.0380, "lon": 76.9780, "type": "TRAFFIC", "severity": "HIGH"},
    ],
    "45": [
        {"lat": 11.0015, "lon": 77.0285, "type": "WATERLOGGING", "severity": "MEDIUM"},
        {"lat": 10.9978, "lon": 76.9617, "type": "ZEBRA_CROSSING", "severity": "LOW"},
    ],
}

HOTSPOT_RADIUS_DEG = 0.0015  # roughly 160 m

class SimulatedBus:
    def __init__(self, bus_id: str, bus_number: str, route_name: str, route_waypoints: List[tuple]):
        self.bus_id = bus_id
        self.bus_number = bus_number
        self.route_name = route_name
        self.waypoints = route_waypoints
        self.speed = random.uniform(28.0, 58.0)  # km/h
        self.status = "ACTIVE"
        self.dwell_steps = 0          # stopped at bus stop
        self.signal_lost_steps = 0    # telemetry link down

        # Compute total route length to scatter buses evenly across the entire corridor length
        _, _, _, total_length = get_position_along_road_path(self.waypoints, 0.0)
        max_dist = max(1000.0, total_length)
        self.distance_traveled = random.uniform(0.0, max_dist)

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
        if random.random() < 0.04:
            self.dwell_steps = random.randint(2, 5)
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
        self.speed = max(15.0, min(65.0, self.speed + random.uniform(-4.0, 4.0)))
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
