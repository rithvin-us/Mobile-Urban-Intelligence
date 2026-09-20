"""
Vehicle Edge AI Road Defect Detection Runner
Simulates or runs onboard NVIDIA Jetson / Edge AI unit mounted on public transport buses.
Continuously captures front-facing optical frames, runs the YOLOv8 Multilabel Road Defect
model, and transmits hazard reports to the central municipal server.
"""

import os
import sys
import time
import uuid
import random
import logging
import argparse
import httpx
from typing import Optional

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from edge.inference.model_registry import ModelRegistry
from edge.inference.multilabel_detector import MultilabelYoloDetector
from edge.event_engine.sqlite_buffer import EdgeSQLiteBuffer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [EdgeAI] %(message)s")
logger = logging.getLogger("BusEdgeAI")

# Sample Coimbatore transit route corridor waypoints
CORRIDOR_WAYPOINTS = [
    (11.0168, 76.9558, "Avinashi Road Flyover"),
    (11.0210, 76.9620, "Lakshmi Mills Junction"),
    (11.0285, 76.9750, "Peelamedu Main Corridor"),
    (11.0340, 76.9910, "PSG Tech Cross Road"),
    (11.0420, 77.0120, "Coimbatore Airport Highway"),
    (11.0012, 77.0179, "Singanallur Bus Terminal Area"),
    (10.9980, 76.9640, "Trichy Road Junction"),
]


class BusEdgeRunner:
    def __init__(
        self,
        bus_id: str = "BUS-005",
        api_base_url: str = "http://localhost:8000",
        confidence_threshold: float = 0.50,
        model_path: Optional[str] = None,
    ):
        # The fleet table keys buses as "bus-005" while the painted number on
        # the vehicle is "BUS-005". Reporting the display form left every edge
        # detection unjoinable to a vehicle in the dashboard.
        self.bus_number = bus_id.upper()
        self.bus_id = bus_id.lower()
        self.api_base_url = api_base_url.rstrip("/")
        self.confidence_threshold = confidence_threshold
        self.buffer = EdgeSQLiteBuffer(db_path=f"edge_buffer_{self.bus_id}.db")

        # Initialize detector
        logger.info(f"Initializing Multilabel YOLOv8 Detector for {self.bus_number}...")
        self.detector: MultilabelYoloDetector = ModelRegistry.create("multilabel_yolo")
        self.detector.load_model(model_path)

        # Route navigation state
        self.waypoint_idx = 0
        self.lat, self.lng, self.current_road = CORRIDOR_WAYPOINTS[0]
        self.speed = 34.0
        self.heading = 78.0

    def step_location(self):
        """Advances bus location slightly along the route corridor."""
        target_lat, target_lng, road_name = CORRIDOR_WAYPOINTS[self.waypoint_idx]
        self.current_road = road_name

        # Interpolate towards waypoint
        self.lat += (target_lat - self.lat) * 0.25 + random.uniform(-0.0002, 0.0002)
        self.lng += (target_lng - self.lng) * 0.25 + random.uniform(-0.0002, 0.0002)
        self.speed = max(18.0, min(52.0, self.speed + random.uniform(-3.0, 3.0)))
        self.heading = (self.heading + random.uniform(-5.0, 5.0)) % 360.0

        dist = abs(target_lat - self.lat) + abs(target_lng - self.lng)
        if dist < 0.0015:
            self.waypoint_idx = (self.waypoint_idx + 1) % len(CORRIDOR_WAYPOINTS)

    def report_telemetry(self) -> None:
        """Posts the current position so the vehicle exists in the fleet table."""
        payload = {
            "bus_id": self.bus_id,
            "bus_number": self.bus_number,
            "route_name": "21A",
            "latitude": round(self.lat, 6),
            "longitude": round(self.lng, 6),
            "heading": round(self.heading, 1),
            "speed": round(self.speed, 1),
            "status": "ACTIVE",
        }
        try:
            with httpx.Client(timeout=4.0) as client:
                client.post(f"{self.api_base_url}/api/buses/telemetry", json=payload)
        except Exception as exc:
            logger.debug(f"Telemetry post failed ({exc}); the defect report still goes out.")

    def scan_road_and_report(self, dry_run: bool = False) -> Optional[dict]:
        """
        Captures road optical frame, evaluates with YOLOv8 multilabel model,
        and transmits detected defect to Central Server for officer action.
        """
        self.step_location()

        sample_video = os.path.join(os.path.dirname(__file__), "data", "sample_dashcam.webm")
        detections = self.detector.infer(sample_video, confidence_threshold=self.confidence_threshold)

        if not detections:
            logger.debug("No road defects detected in current frame scan.")
            return None

        primary_detection = detections[0]
        event_type = primary_detection.class_name
        conf = primary_detection.confidence
        meta = primary_detection.metadata or {}
        severity = meta.get("severity", "MEDIUM")

        # Generate optical frame snapshot with YOLO bounding boxes and HUD
        gps_hud_str = f"GPS: {self.lat:.4f}, {self.lng:.4f} · {self.speed:.0f} km/h"

        # Match optical frame to defect class from local evidence library
        evidence_photo = None
        evidence_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "web", "public", "evidence"))
        defect_img_map = {
            "POTHOLE": os.path.join(evidence_dir, "pothole_sample.jpg"),
            "WATERLOGGING": os.path.join(evidence_dir, "waterlogging_sample.jpg"),
            "ROAD_DAMAGE": os.path.join(evidence_dir, "road_damage_sample.jpg"),
            "TRAFFIC": os.path.join(evidence_dir, "traffic_sample.jpg"),
        }
        cand = defect_img_map.get(event_type)
        if cand and os.path.exists(cand):
            evidence_photo = cand
        elif os.path.exists(sample_video):
            evidence_photo = sample_video

        evidence_b64 = self.detector.annotate_frame_base64(
            evidence_photo,
            detections,
            bus_id=self.bus_number,
            gps_text=gps_hud_str,
        )

        event_payload = {
            "id": f"edge-{self.bus_id}-{int(time.time()*1000)}",
            "bus_id": self.bus_id,
            "event_type": event_type,
            "confidence": conf,
            "severity": severity,
            "latitude": round(self.lat, 6),
            "longitude": round(self.lng, 6),
            "status": "NEW",
            "evidence_url": evidence_b64,
            "metadata_payload": {
                "bus_number": self.bus_number,
                "source": "EDGE_AI_ONBOARD_CAM",
                "model": meta.get("model", "YOLOv8-Multilabel-150epochs"),
                "defect_class": meta.get("detection_label", event_type.lower()),
                "road_name": self.current_road,
                "speed_kmh": round(self.speed, 1),
                "heading_deg": round(self.heading, 1),
                "officer_action": "DISPATCH_REPAIR_CREW" if severity in ["HIGH", "CRITICAL"] else "SCHEDULE_INSPECTION",
            },
        }

        logger.info(
            f"[DEFECT DETECTED] [{event_type} | {conf*100:.1f}%] at {self.current_road} ({self.lat:.4f}, {self.lng:.4f})"
        )

        if dry_run:
            logger.info(f"[DryRun] Event payload generated successfully: {event_payload['event_type']}")
            return event_payload

        # Transmit to Central Server with offline buffering
        self.report_telemetry()
        event_uuid = f"edge-{self.bus_id}-{int(time.time()*1000)}"
        self._transmit_event(event_uuid, event_payload)

        # Flush any previously buffered offline events
        self._flush_buffered_events()
        return event_payload

    def _transmit_event(self, event_uuid: str, payload: dict):
        """Sends HTTP POST to /api/events with fallback to local SQLite buffer."""
        endpoint = f"{self.api_base_url}/api/events"
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.post(endpoint, json=payload)
                if res.status_code in [200, 201]:
                    logger.info(f"[SUCCESS] Transmitted defect event to Central Server: {res.json().get('id')}")
                else:
                    logger.warning(f"Server returned HTTP {res.status_code}. Buffering event locally.")
                    self.buffer.buffer_event(event_uuid, payload)
        except Exception as e:
            logger.warning(f"Central server unreachable ({e}). Buffering event locally for store-and-forward.")
            self.buffer.buffer_event(event_uuid, payload)

    def _flush_buffered_events(self):
        """Attempts to flush buffered events to central server."""
        pending = self.buffer.get_pending_events(limit=5)
        if not pending:
            return

        logger.info(f"Attempting to flush {len(pending)} buffered offline events...")
        endpoint = f"{self.api_base_url}/api/events"
        for item in pending:
            try:
                with httpx.Client(timeout=4.0) as client:
                    res = client.post(endpoint, json=item["payload"])
                    if res.status_code in [200, 201]:
                        self.buffer.remove_buffered_event(item["db_id"])
                        logger.info(f"Flushed buffered event {item['event_uuid']}")
            except Exception:
                break


def main():
    parser = argparse.ArgumentParser(description="Bus Onboard Edge AI Road Defect Detection Runner")
    parser.add_argument("--bus-id", type=str, default="BUS-005", help="Reporting bus fleet identifier")
    parser.add_argument("--api-url", type=str, default=os.getenv("API_BASE_URL", "http://localhost:8000"), help="Central API base URL")
    parser.add_argument("--interval", type=float, default=3.0, help="Interval in seconds between road surface scans")
    parser.add_argument("--count", type=int, default=1, help="Number of scans to perform (0 = infinite loop)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate inference without network transmission")

    args = parser.parse_args()

    runner = BusEdgeRunner(bus_id=args.bus_id, api_base_url=args.api_url)

    scans_done = 0
    try:
        while True:
            runner.scan_road_and_report(dry_run=args.dry_run)
            scans_done += 1
            if args.count > 0 and scans_done >= args.count:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        logger.info("Bus Edge AI stopped by user.")


if __name__ == "__main__":
    main()
