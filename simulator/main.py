import os
import sys
import time
import random
import logging
import httpx

# Add monorepo root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from simulator.buses.manager import create_10_simulated_buses
from simulator.events.generator import generate_random_event

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Simulator")

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

def run_simulator(duration_seconds: int = 0, loop_interval: float = 2.0):
    """
    Runs the simulator continuously or for a fixed duration.
    If duration_seconds == 0, runs indefinitely.
    """
    logger.info(f"Starting Urban Intelligence Bus & Event Simulator targeting {API_BASE_URL}")
    buses = create_10_simulated_buses()
    start_time = time.time()
    step_count = 0

    with httpx.Client(base_url=API_BASE_URL, timeout=10.0) as client:
        while True:
            step_count += 1
            logger.info(f"--- Simulation Step #{step_count} ---")
            
            # Step each bus and send telemetry
            for bus in buses:
                bus.step()
                telemetry = bus.to_telemetry_payload()
                try:
                    res = client.post("/api/buses/telemetry", json=telemetry)
                    if res.status_code == 200:
                        logger.debug(f"Telemetry sent for {bus.bus_number} ({bus.bus_id})")
                    else:
                        logger.warning(f"Failed telemetry for {bus.bus_id}: {res.status_code}")
                except Exception as e:
                    logger.error(f"Error posting telemetry to API: {e}")

                # Random chance (30%) to trigger a road event for this bus
                if random.random() < 0.30:
                    event_payload = generate_random_event(bus)
                    try:
                        res = client.post("/api/events", json=event_payload)
                        if res.status_code == 201:
                            logger.info(f"🚨 Event Triggered: {event_payload['event_type']} ({event_payload['severity']}) by {bus.bus_number}")
                        else:
                            logger.warning(f"Failed event post: {res.status_code}")
                    except Exception as e:
                        logger.error(f"Error posting event to API: {e}")

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
