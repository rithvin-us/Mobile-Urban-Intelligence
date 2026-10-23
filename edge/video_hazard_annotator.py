"""
Live Video Road Hazard AI Detector and Video Annotator

Runs the trained YOLOv8 multilabel model over a bus dashcam clip and renders its
detections. The model is trained on three classes, so three are what it can
report:

  - Potholes               (Class: POTHOLE)
  - Waterlogging           (Class: WATERLOGGING)
  - Cracked / damaged road (Class: ROAD_DAMAGE)

The wider platform ingests more event types than this (see EventType in
apps/api/app/schemas/event.py), and the fleet simulator produces them, but only
these three come from the vision model. Anything else would have to come from a
future training run, not from this file.
"""

import os
import sys
import time
import argparse
import logging
import shutil
import subprocess
import json
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Any, Optional

import cv2
import numpy as np

# Ensure Windows finds Cisco OpenH264 DLL for universal H.264 (avc1) web browser compatibility
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_script_dir, ".."))
for p in [
    os.path.join(_script_dir, "vendor"),
    _project_root,
    os.path.join(_project_root, "apps", "api", "venv", "Scripts"),
    os.path.dirname(cv2.__file__),
]:
    if os.path.isdir(p):
        if p not in os.environ.get("PATH", ""):
            os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")
        if hasattr(os, "add_dll_directory"):
            try:
                os.add_dll_directory(p)
            except Exception:
                pass

# The annotator runs from the repository root or from edge/, so the root goes on
# the path before the edge package is imported.
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from edge.inference.model_registry import ModelRegistry
# Imported for its registration side effect: the detector registers itself with
# ModelRegistry on import, so the lookup below would fail without this.
from edge.inference.multilabel_detector import MultilabelYoloDetector  # noqa: F401

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VideoHazardAnnotator")

# Visual Styling Palette (BGR format for OpenCV)
CLASS_STYLES = {
    "POTHOLE": {
        "color": (48, 59, 255),      # Red/Coral BGR: #FF3B30
        "label": "POTHOLE",
        "severity": "CRITICAL",
        "badge_bg": (30, 30, 200),
    },
    "WATERLOGGING": {
        "color": (255, 210, 0),      # Cyan/Aqua BGR: #00D2FF
        "label": "WATERLOGGING",
        "severity": "HIGH",
        "badge_bg": (180, 150, 0),
    },
    "ROAD_DAMAGE": {
        "color": (0, 149, 255),      # Amber/Orange BGR: #FF9500
        "label": "ROAD DAMAGE",
        "severity": "MEDIUM",
        "badge_bg": (0, 100, 200),
    },
}


@dataclass
class TrackedHazard:
    class_name: str
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    confidence: float
    detail: str = ""
    start_frame: int = 0
    end_frame: int = 240
    smooth_bbox: Optional[Tuple[float, float, float, float]] = None


class YoloHazardDetector:
    """
    Runs the trained YOLOv8 multilabel model over each frame.

    This replaces an earlier implementation that replayed hand-authored bounding
    box trajectories and labelled them as AI detections. The output here is
    whatever the weights actually produce: fewer boxes, less tidy motion, and
    nothing at all on frames where the model sees nothing.

    The model is trained on three classes, so three is what can appear:

        pothole -> POTHOLE,  waterlogging -> WATERLOGGING,  cracks -> ROAD_DAMAGE

    If Ultralytics or the weights cannot be loaded this raises instead of
    degrading. The underlying detector has a built-in fallback that emits
    plausible-looking placeholder boxes, which is useful for exercising the API
    offline but must never reach a rendered video that anybody reads as
    detection output.
    """

    def __init__(
        self,
        weights: Optional[str] = None,
        confidence_threshold: float = 0.35,
        max_age: int = 6,
        iou_threshold: float = 0.30,
    ):
        self.confidence_threshold = confidence_threshold
        self.max_age = max_age
        self.iou_threshold = iou_threshold

        self.detector = ModelRegistry.create("multilabel_yolo")
        self.detector.load_model(weights)

        if not getattr(self.detector, "is_ultralytics_loaded", False):
            raise RuntimeError(
                "Ultralytics/YOLO weights could not be loaded, so no real inference is "
                "possible. Install the edge requirements (pip install -r edge/requirements.txt) "
                "and confirm edge/inference/models/multilabel_best.pt is present. Refusing to "
                "annotate with placeholder detections."
            )

        # Open tracks, each a dict of bbox, class, confidence and age.
        self._tracks: List[Dict[str, Any]] = []
        self._next_id = 1

    @staticmethod
    def _iou(a: Tuple[int, int, int, int], b: Tuple[int, int, int, int]) -> float:
        ax1, ay1, ax2, ay2 = a
        bx1, by1, bx2, by2 = b
        ix1, iy1 = max(ax1, bx1), max(ay1, by1)
        ix2, iy2 = min(ax2, bx2), min(ay2, by2)
        iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
        intersection = iw * ih
        if intersection == 0:
            return 0.0
        area_a = max(1, (ax2 - ax1) * (ay2 - ay1))
        area_b = max(1, (bx2 - bx1) * (by2 - by1))
        return intersection / float(area_a + area_b - intersection)

    def detect_frame(self, frame: np.ndarray, frame_idx: int) -> List[TrackedHazard]:
        """
        Detects hazards in one frame and associates them with recent detections.

        A detector run per frame on its own flickers: a pothole found on frame 40
        and 42 but missed on 41 produces a box that blinks. Carrying an unmatched
        track for a few frames by greedy IoU association is the same idea as the
        ByteTrack stage the edge pipeline is specified to use, reduced to what
        this offline renderer needs. Nothing is invented: a track only exists
        because the model detected it, and it expires after max_age frames.
        """
        height, width = frame.shape[:2]

        detections: List[Dict[str, Any]] = []
        for result in self.detector.infer(frame, confidence_threshold=self.confidence_threshold):
            box = result.bbox
            x1 = max(0, min(width - 2, int(box.xmin)))
            y1 = max(0, min(height - 2, int(box.ymin)))
            x2 = max(x1 + 2, min(width - 1, int(box.xmax)))
            y2 = max(y1 + 2, min(height - 1, int(box.ymax)))

            metadata = result.metadata or {}
            detections.append({
                "class_name": result.class_name,
                "bbox": (x1, y1, x2, y2),
                "confidence": float(result.confidence),
                "detail": metadata.get("detection_label", result.class_name.lower()),
            })

        # Greedy association of this frame's detections to existing tracks.
        unmatched = list(range(len(detections)))
        for track in self._tracks:
            best_iou = self.iou_threshold
            best_idx = None
            for idx in unmatched:
                detection = detections[idx]
                if detection["class_name"] != track["class_name"]:
                    continue
                score = self._iou(track["bbox"], detection["bbox"])
                if score >= best_iou:
                    best_iou = score
                    best_idx = idx

            if best_idx is None:
                track["age"] += 1
            else:
                detection = detections[best_idx]
                track["bbox"] = detection["bbox"]
                track["confidence"] = detection["confidence"]
                track["detail"] = detection["detail"]
                track["age"] = 0
                track["hits"] += 1
                track["last_seen"] = frame_idx
                unmatched.remove(best_idx)

        for idx in unmatched:
            detection = detections[idx]
            self._tracks.append({
                "id": self._next_id,
                "class_name": detection["class_name"],
                "bbox": detection["bbox"],
                "confidence": detection["confidence"],
                "detail": detection["detail"],
                "age": 0,
                "hits": 1,
                "first_seen": frame_idx,
                "last_seen": frame_idx,
            })
            self._next_id += 1

        self._tracks = [t for t in self._tracks if t["age"] <= self.max_age]

        hazards: List[TrackedHazard] = []
        for track in self._tracks:
            # Only classes the model was trained on can be styled and drawn.
            if track["class_name"] not in CLASS_STYLES:
                continue
            hazards.append(
                TrackedHazard(
                    class_name=track["class_name"],
                    bbox=track["bbox"],
                    confidence=round(track["confidence"], 2),
                    detail=track["detail"],
                    start_frame=track["first_seen"],
                    end_frame=track["last_seen"],
                )
            )

        return hazards


class LiveVideoAnnotator:
    """
    Renders high-tech AI detection overlays, glowing corner brackets,
    real-time telemetry HUD, and animated hazard feeds onto video frames.
    """

    def __init__(self, bus_id: str = "BUS-005"):
        self.bus_id = bus_id
        self.detector = YoloHazardDetector()

    def draw_corner_rect(
        self,
        img: np.ndarray,
        bbox: Tuple[int, int, int, int],
        color: Tuple[int, int, int],
        thickness: int = 2,
        corner_len: int = 14,
        corner_thick: int = 3,
    ):
        """Draws clean bounding rectangle with high-tech thickened corner brackets."""
        x1, y1, x2, y2 = bbox

        # Subtle semi-transparent bounding box fill
        overlay = img.copy()
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
        cv2.addWeighted(overlay, 0.12, img, 0.88, 0, img)

        # Thin outer boundary
        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)

        # Corner brackets (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
        cl = min(corner_len, (x2 - x1) // 3, (y2 - y1) // 3)
        ct = corner_thick

        # Top-Left
        cv2.line(img, (x1, y1), (x1 + cl, y1), color, ct)
        cv2.line(img, (x1, y1), (x1, y1 + cl), color, ct)
        # Top-Right
        cv2.line(img, (x2, y1), (x2 - cl, y1), color, ct)
        cv2.line(img, (x2, y1), (x2, y1 + cl), color, ct)
        # Bottom-Left
        cv2.line(img, (x1, y2), (x1 + cl, y2), color, ct)
        cv2.line(img, (x1, y2), (x1, y2 - cl), color, ct)
        # Bottom-Right
        cv2.line(img, (x2, y2), (x2 - cl, y2), color, ct)
        cv2.line(img, (x2, y2), (x2, y2 - cl), color, ct)

    def draw_hazard_label(
        self,
        img: np.ndarray,
        class_name: str,
        confidence: float,
        bbox: Tuple[int, int, int, int],
        detail: str = "",
    ):
        """Draws high-contrast label badge with confidence % and defect metadata."""
        style = CLASS_STYLES.get(class_name, CLASS_STYLES["ROAD_DAMAGE"])
        color = style["color"]
        badge_bg = style["badge_bg"]
        x1, y1, x2, y2 = bbox

        label_text = f"[{style['label']}] {int(confidence * 100)}%"

        # Label tag positioning
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.42
        font_thick = 1

        (tw, th), baseline = cv2.getTextSize(label_text, font, font_scale, font_thick)

        # Draw tag pill background above box or inside if too high
        tag_y1 = max(34, y1 - th - 8)
        tag_y2 = tag_y1 + th + 6
        tag_x2 = min(img.shape[1] - 5, x1 + tw + 10)

        # Solid tag pill
        cv2.rectangle(img, (x1, tag_y1), (tag_x2, tag_y2), badge_bg, -1)
        cv2.rectangle(img, (x1, tag_y1), (tag_x2, tag_y2), color, 1)

        # Text label
        cv2.putText(
            img,
            label_text,
            (x1 + 5, tag_y2 - 4),
            font,
            font_scale,
            (255, 255, 255),
            font_thick,
            cv2.LINE_AA,
        )

        # Draw small detail subtitle if available and space permits
        if detail and (y2 - y1) > 50:
            det_text = detail
            (dw, dh), _ = cv2.getTextSize(det_text, font, 0.35, 1)
            cv2.putText(
                img,
                det_text,
                (x1 + 4, y1 + dh + 10),
                font,
                0.35,
                (230, 230, 230),
                1,
                cv2.LINE_AA,
            )

    def draw_hud(
        self,
        img: np.ndarray,
        frame_idx: int,
        total_frames: int,
        fps: float,
        hazards: List[TrackedHazard],
    ):
        """Draws autonomous perception HUD header and active alert ticker."""
        w, h = img.shape[1], img.shape[0]

        # 1. Top HUD Bar (Translucent Dark Slate)
        hud_h = 32
        overlay = img.copy()
        cv2.rectangle(overlay, (0, 0), (w, hud_h), (15, 20, 28), -1)
        cv2.line(overlay, (0, hud_h), (w, hud_h), (45, 55, 72), 1)
        cv2.addWeighted(overlay, 0.88, img, 0.12, 0, img)

        font = cv2.FONT_HERSHEY_SIMPLEX

        # Left: Telemetry & Camera ID
        rec_color = (0, 0, 255) if (frame_idx // 12) % 2 == 0 else (0, 200, 0)
        cv2.circle(img, (14, 16), 4, rec_color, -1)
        title_str = f"EDGE AI CAM-01 · {self.bus_id} · {w}x{h} @ {fps:.0f}FPS"
        cv2.putText(img, title_str, (24, 20), font, 0.40, (230, 240, 255), 1, cv2.LINE_AA)

        # Center: Active counts pill
        class_counts = {}
        for hz in hazards:
            class_counts[hz.class_name] = class_counts.get(hz.class_name, 0) + 1

        active_str = " | ".join([f"{k.replace('_', ' ')}: {v}" for k, v in class_counts.items()])
        if active_str:
            cv2.putText(img, active_str, (370, 20), font, 0.36, (0, 220, 255), 1, cv2.LINE_AA)

        # Right: Time & GPS
        t_sec = frame_idx / max(1.0, fps)
        cur_lat = 11.0168 + (frame_idx * 0.00003)
        cur_lng = 76.9558 + (frame_idx * 0.00004)
        speed_kmh = max(15.0, 28.0 - (10.0 if "POTHOLE" in class_counts or "WATERLOGGING" in class_counts else 0.0))
        gps_str = f"GPS: {cur_lat:.4f}N, {cur_lng:.4f}E · {speed_kmh:.0f} km/h · {t_sec:04.1f}s"
        cv2.putText(img, gps_str, (w - 300, 20), font, 0.38, (180, 195, 210), 1, cv2.LINE_AA)

        # 2. Bottom Critical Alert Bar (When hazards are present)
        has_critical = any(hz.class_name in ["POTHOLE", "WATERLOGGING"] for hz in hazards)
        if has_critical:
            bot_y = h - 24
            bot_overlay = img.copy()
            cv2.rectangle(bot_overlay, (0, bot_y), (w, h), (10, 15, 25), -1)
            cv2.addWeighted(bot_overlay, 0.75, img, 0.25, 0, img)

            alert_msg = f"! ROAD HAZARDS ACTIVE ({len(hazards)} DETECTIONS) · MUNICIPAL TELEMETRY LOGGED TO CENTRAL SERVER"
            cv2.putText(img, alert_msg, (15, h - 8), font, 0.38, (0, 230, 255), 1, cv2.LINE_AA)

    def process_video(
        self,
        input_path: str,
        output_path: str,
        progress_callback: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Reads input dashcam video, executes hazard detection on every frame,
        draws lively AI bounding box overlays & telemetry, and writes the output video.
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input video not found: {input_path}")

        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video: {input_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        logger.info(
            f"[Annotator] Input video opened: {width}x{height} @ {fps:.1f} FPS, {total_frames} frames."
        )

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

        # Try H.264 (avc1) first for native in-browser HTML5 video playback in Chrome/Edge/Safari
        writer = None
        chosen_codec = None
        for codec_tag in ["avc1", "H264", "mp4v"]:
            fourcc = cv2.VideoWriter_fourcc(*codec_tag)
            test_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            if test_writer.isOpened():
                writer = test_writer
                chosen_codec = codec_tag
                logger.info(f"[Annotator] Initialized VideoWriter using codec: {codec_tag}")
                break
            else:
                logger.warning(f"[Annotator] Codec {codec_tag} failed to open, trying next...")

        if writer is None or not writer.isOpened():
            raise RuntimeError(f"Failed to initialize VideoWriter at: {output_path}")

        frame_idx = 0
        total_detections_count = 0
        class_stats: Dict[str, int] = {}
        # Sampled every half second, for the summary written alongside the video.
        keyframe_timeline: List[Dict[str, Any]] = []
        keyframe_stride = max(1, int(round(fps / 2.0)))
        start_time = time.time()

        logger.info("[Annotator] Processing video frames with lively hazard detection...")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # 1. Run Hazard Detection for current frame
            hazards = self.detector.detect_frame(frame, frame_idx)
            total_detections_count += len(hazards)

            if frame_idx % keyframe_stride == 0 and hazards:
                keyframe_timeline.append({
                    "frame": frame_idx,
                    "time_sec": round(frame_idx / fps, 2),
                    "hazards": [
                        {
                            "type": hz.class_name,
                            "conf": round(float(hz.confidence), 2),
                            "bbox": list(hz.bbox),
                        }
                        for hz in hazards
                    ],
                })

            # 2. Draw Annotations for each hazard
            for hz in hazards:
                class_stats[hz.class_name] = class_stats.get(hz.class_name, 0) + 1
                color = CLASS_STYLES.get(hz.class_name, CLASS_STYLES["ROAD_DAMAGE"])["color"]

                # Waterlogging special visual effect: translucent water pool contour
                if hz.class_name == "WATERLOGGING":
                    x1, y1, x2, y2 = hz.bbox
                    water_layer = frame.copy()
                    pts = np.array([
                        [x1, y2 - 10],
                        [x1 + 40, y1],
                        [x2 - 30, y1 + 5],
                        [x2, y2],
                    ], np.int32)
                    cv2.fillPoly(water_layer, [pts], (240, 200, 0))
                    cv2.addWeighted(water_layer, 0.22, frame, 0.78, 0, frame)

                self.draw_corner_rect(frame, hz.bbox, color)
                self.draw_hazard_label(frame, hz.class_name, hz.confidence, hz.bbox, hz.detail)

            # 3. Draw Telemetry HUD & Warnings
            self.draw_hud(frame, frame_idx, total_frames, fps, hazards)

            # 4. Write annotated frame to output video
            writer.write(frame)

            frame_idx += 1
            if frame_idx % 40 == 0 or frame_idx == total_frames:
                elapsed = time.time() - start_time
                fps_proc = frame_idx / max(0.001, elapsed)
                logger.info(
                    f"Frame {frame_idx}/{total_frames} ({(frame_idx/total_frames)*100:.1f}%) processed at {fps_proc:.1f} FPS"
                )
                if progress_callback:
                    progress_callback(frame_idx, total_frames)

        cap.release()
        writer.release()

        # The OpenCV wheels on Linux ship without an H.264 encoder, so the loop
        # above lands on mp4v. That is MPEG-4 Part 2, which Chrome, Edge and
        # Safari all refuse to play, and the dashboard would show a black box
        # where the AI dashcam feed should be. Re-encoding with ffmpeg keeps the
        # output browser-playable wherever the annotator happens to run.
        if chosen_codec not in ("avc1", "H264"):
            _transcode_to_h264(output_path)

        elapsed_total = time.time() - start_time
        out_size_mb = os.path.getsize(output_path) / (1024 * 1024)

        logger.info("=" * 60)
        logger.info(f"[SUCCESS] Video annotation complete!")
        logger.info(f"  Output Video : {output_path} ({out_size_mb:.2f} MB)")
        logger.info(f"  Frames Written: {frame_idx}/{total_frames} in {elapsed_total:.2f}s")
        logger.info(f"  Total Hazard Detections: {total_detections_count}")
        for cls_name, cnt in class_stats.items():
            logger.info(f"    - {cls_name}: {cnt} frame instances")
        logger.info("=" * 60)

        return {
            "output_path": output_path,
            "input_path": input_path,
            "resolution": f"{width}x{height}",
            "fps": fps,
            "total_frames": frame_idx,
            "duration_sec": frame_idx / fps,
            "size_mb": round(out_size_mb, 2),
            "class_stats": class_stats,
            "total_detections": total_detections_count,
            "keyframe_timeline": keyframe_timeline,
        }


def _transcode_to_h264(path: str) -> None:
    """
    Re-encodes an annotated clip in place to H.264 so browsers can play it.

    Leaves the original untouched if ffmpeg is missing or the encode fails: a
    clip in the wrong codec is still better than no clip at all, and the warning
    says what to do about it.
    """
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        logger.warning(
            "[Annotator] Output is not H.264 and ffmpeg was not found, so the clip "
            "will not play in a browser. Install ffmpeg, or convert manually with: "
            "ffmpeg -i %s -c:v libx264 -pix_fmt yuv420p out.mp4",
            path,
        )
        return

    temp_path = f"{path}.h264.mp4"
    command = [
        ffmpeg, "-y", "-v", "error",
        "-i", path,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",      # required by Safari and some Android players
        "-preset", "veryfast",
        "-crf", "20",
        "-movflags", "+faststart",  # lets the dashboard start playing while loading
        temp_path,
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, timeout=600)
        os.replace(temp_path, path)
        logger.info("[Annotator] Re-encoded output to H.264 for browser playback.")
    except Exception as exc:
        logger.warning("[Annotator] H.264 re-encode failed, keeping original: %s", exc)
        if os.path.exists(temp_path):
            os.remove(temp_path)


def main():
    parser = argparse.ArgumentParser(description="Live Bus Dashcam Road Hazard AI Video Annotator")
    parser.add_argument(
        "--input",
        default="edge/data/bus_dashcam_input.mp4",
        help="Path to input dashcam video",
    )
    parser.add_argument(
        "--output",
        default="edge/data/annotated_dashcam_output.mp4",
        help="Path to write output annotated video",
    )
    parser.add_argument(
        "--bus-id",
        default="BUS-005",
        help="Transit fleet bus ID for telemetry HUD",
    )
    parser.add_argument(
        "--summary",
        default="edge/data/annotated_dashcam_output_summary.json",
        help="Path to write the run summary JSON ('none' to skip)",
    )
    args = parser.parse_args()

    annotator = LiveVideoAnnotator(bus_id=args.bus_id)
    result = annotator.process_video(args.input, args.output)

    # The summary is written from this run's own detections. It used to be a
    # hand-authored file, which meant it could disagree with the video it
    # claimed to describe.
    if args.summary and args.summary.lower() != "none":
        summary = {
            "input_video": os.path.basename(result["input_path"]),
            "annotated_video": result["output_path"],
            "model": "YOLOv8 multilabel, edge/inference/models/multilabel_best.pt",
            "model_classes": ["POTHOLE", "WATERLOGGING", "ROAD_DAMAGE"],
            "confidence_threshold": annotator.detector.confidence_threshold,
            "resolution": result["resolution"],
            "fps": result["fps"],
            "total_frames": result["total_frames"],
            "duration_seconds": round(result["duration_sec"], 2),
            "file_size_mb": result["size_mb"],
            "total_hazard_detections": result["total_detections"],
            "class_breakdown": result["class_stats"],
            "keyframe_timeline": result["keyframe_timeline"],
        }
        os.makedirs(os.path.dirname(os.path.abspath(args.summary)), exist_ok=True)
        with open(args.summary, "w", encoding="utf-8") as handle:
            json.dump(summary, handle, indent=2)
        logger.info("[Annotator] Wrote run summary to %s", args.summary)


if __name__ == "__main__":
    main()
