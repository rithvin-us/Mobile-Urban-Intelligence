import os
import sys
import time
import random
import logging

import httpx

# Add monorepo root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from simulator.buses.manager import create_simulated_fleet
from simulator.events.generator import generate_hotspot_event, generate_random_event

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Simulator")

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
FLEET_SIZE = int(os.getenv("SIMULATOR_FLEET_SIZE", "24"))

# Chance per bus per step of reporting the hotspot it is passing, and of an
# opportunistic detection anywhere on the route.
HOTSPOT_REPORT_CHANCE = 0.45
OPPORTUNISTIC_CHANCE = 0.05


def run_simulator(duration_seconds: int = 0, loop_interval: float = 2.0):
    """
    Runs the simulator continuously or for a fixed duration.
    If duration_seconds == 0, runs indefinitely.
    """
    logger.info(f"Starting Coimbatore fleet simulator ({FLEET_SIZE} buses) against {API_BASE_URL}")
    buses = create_simulated_fleet(FLEET_SIZE)
    start_time = time.time()
    step_count = 0

    with httpx.Client(base_url=API_BASE_URL, timeout=10.0) as client:
        while True:
            step_count += 1
            telemetry_sent = 0
            events_sent = 0

            for bus in buses:
                bus.step()

                # A bus in a dead zone simply stops reporting; the dashboard
                # marks it offline once its telemetry goes stale.
                if not bus.is_transmitting:
                    continue

                try:
                    res = client.post("/api/buses/telemetry", json=bus.to_telemetry_payload())
                    if res.status_code == 200:
                        telemetry_sent += 1
                    else:
                        logger.warning(f"Failed telemetry for {bus.bus_id}: {res.status_code}")
                except Exception as e:
                    logger.error(f"Error posting telemetry to API: {e}")
                    continue

                if bus.status == "MAINTENANCE":
                    continue

                payload = None
                if random.random() < HOTSPOT_REPORT_CHANCE:
                    payload = generate_hotspot_event(bus)
                if payload is None and random.random() < OPPORTUNISTIC_CHANCE:
                    payload = generate_random_event(bus)
                if payload is None:
                    continue

                try:
                    res = client.post("/api/events", json=payload)
                    if res.status_code == 201:
                        events_sent += 1
                        logger.info(
                            f"Detection: {payload['event_type']} ({payload['severity']}) "
                            f"by {bus.bus_number} on route {bus.route_name}"
                        )
                    else:
                        logger.warning(f"Failed event post: {res.status_code}")
                except Exception as e:
                    logger.error(f"Error posting event to API: {e}")

            logger.info(f"Step {step_count}: {telemetry_sent} telemetry, {events_sent} detections")

            if duration_seconds > 0 and (time.time() - start_time) >= duration_seconds:
                logger.info(f"Simulator reached requested duration of {duration_seconds}s. Stopping.")
                break

            time.sleep(loop_interval)


if __name__ == "__main__":
    duration = 0
    if len(sys.argv) > 1:
        try:
            duration = int(sys.argv[1])
        except ValueError:
            duration = 0
    run_simulator(duration_seconds=duration)
