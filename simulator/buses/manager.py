import random
from typing import List, Dict, Any
from simulator.gps.interpolator import calculate_heading, interpolate_position

# Define 3 realistic urban transit routes with GPS waypoints (e.g. Mumbai urban corridors)
ROUTES = {
    "Route 101 - Central Corridor": [
        (19.0760, 72.8777),
        (19.0820, 72.8830),
        (19.0900, 72.8900),
        (19.0980, 72.8850),
        (19.0900, 72.8750),
        (19.0760, 72.8777)
    ],
    "Route 202 - West Coast Line": [
        (19.0400, 72.8200),
        (19.0500, 72.8300),
        (19.0650, 72.8350),
        (19.0800, 72.8400),
        (19.0650, 72.8350),
        (19.0400, 72.8200)
    ],
    "Route 303 - Express Ring": [
        (19.1100, 72.8600),
        (19.1200, 72.8750),
        (19.1150, 72.8900),
        (19.1000, 72.8800),
        (19.1100, 72.8600)
    ]
}

class SimulatedBus:
    def __init__(self, bus_id: str, bus_number: str, route_name: str, route_waypoints: List[tuple]):
        self.bus_id = bus_id
        self.bus_number = bus_number
        self.route_name = route_name
        self.waypoints = route_waypoints
        self.current_waypoint_idx = 0
        self.progress = 0.0  # 0.0 to 1.0 between current and next waypoint
        self.lat, self.lon = self.waypoints[0]
        self.heading = 0.0
        self.speed = random.uniform(20.0, 45.0)
        self.status = "ACTIVE"

    def step(self):
        # Advance progress
        step_increment = random.uniform(0.05, 0.12)
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
        self.speed = max(5.0, min(65.0, self.speed + random.uniform(-3.0, 3.0)))

    def to_telemetry_payload(self) -> Dict[str, Any]:
        return {
            "bus_id": self.bus_id,
            "bus_number": self.bus_number,
            "route_name": self.route_name,
            "latitude": round(self.lat, 6),
            "longitude": round(self.lon, 6),
            "heading": round(self.heading, 1),
            "speed": round(self.speed, 1),
            "status": self.status
        }

def create_10_simulated_buses() -> List[SimulatedBus]:
    buses = []
    route_keys = list(ROUTES.keys())
    for i in range(1, 11):
        bus_id = f"bus-{i:03d}"
        bus_number = f"BUS-{100 + i}"
        route_name = route_keys[(i - 1) % len(route_keys)]
        waypoints = ROUTES[route_name]
        buses.append(SimulatedBus(bus_id, bus_number, route_name, waypoints))
    return buses
