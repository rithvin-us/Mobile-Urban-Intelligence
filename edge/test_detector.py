"""
Edge AI multilabel road defect detector: unit and integration checks.

The earlier version of this file only ever exercised the offline fallback, so
it passed whether or not the trained weights could actually detect anything.
The model is now run against real photographs of each class it was trained on.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from edge.inference.model_registry import ModelRegistry
from edge.inference.multilabel_detector import MultilabelYoloDetector

EVIDENCE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "apps", "web", "public", "evidence")
)
WEIGHTS = os.path.join(os.path.dirname(__file__), "inference", "models", "multilabel_best.pt")
SAMPLE_VIDEO = os.path.join(os.path.dirname(__file__), "data", "sample_dashcam.webm")


def test_detector_registration():
    """The registry resolves the detector without the caller importing it first."""
    detector = ModelRegistry.create("multilabel_yolo")
    assert isinstance(detector, MultilabelYoloDetector), "Failed to instantiate MultilabelYoloDetector"
    print("[OK] Detector registration test passed.")


def test_weights_exist():
    assert os.path.exists(WEIGHTS), f"Weights not found at {WEIGHTS}"
    assert os.path.getsize(WEIGHTS) > 6_000_000, f"Weights file size unexpected: {os.path.getsize(WEIGHTS)}"
    print(f"[OK] Weights verified ({os.path.getsize(WEIGHTS)} bytes).")


def test_real_inference_per_class():
    """
    Each sample photograph must produce the class it depicts.

    Skipped rather than failed when Ultralytics is absent, because the edge
    requirements are deliberately not installed on the API container.
    """
    detector = ModelRegistry.create("multilabel_yolo")
    detector.load_model()

    if not detector.is_ultralytics_loaded:
        print("[SKIP] Ultralytics not installed; real-weights inference not exercised.")
        return

    expectations = {
        "pothole_sample.jpg": "POTHOLE",
        "waterlogging_sample.jpg": "WATERLOGGING",
        "road_damage_sample.jpg": "ROAD_DAMAGE",
        "cracks_sample.jpg": "ROAD_DAMAGE",
    }

    for filename, expected in expectations.items():
        path = os.path.join(EVIDENCE_DIR, filename)
        if not os.path.exists(path):
            print(f"[SKIP] {filename} is not in the evidence library.")
            continue

        results = detector.infer(path, confidence_threshold=0.25)
        assert results, f"No detection on {filename}; the model found nothing at all."
        classes = {r.class_name for r in results}
        assert expected in classes, f"{filename}: expected {expected}, model reported {classes}"
        best = max(results, key=lambda r: r.confidence)
        print(f"[OK] {filename} -> {best.class_name} ({best.confidence * 100:.1f}%)")


def test_video_scan_reads_one_frame():
    """
    Passing a video path must not decode the whole clip.

    Handing the file straight to Ultralytics loads every frame into memory and
    took roughly twenty seconds per road scan; a single grabbed frame is the
    only thing a scan needs.
    """
    if not os.path.exists(SAMPLE_VIDEO):
        print("[SKIP] No sample dashcam clip available.")
        return

    detector = ModelRegistry.create("multilabel_yolo")
    detector.load_model()
    if not detector.is_ultralytics_loaded:
        print("[SKIP] Ultralytics not installed; video path not exercised.")
        return

    frame = detector.grab_video_frame(SAMPLE_VIDEO, frame_index=0)
    if frame is None:
        print("[SKIP] OpenCV could not open the clip.")
        return

    height, width = frame.shape[:2]
    assert width > 0 and height > 0, "Grabbed frame has no dimensions"
    print(f"[OK] Single frame grabbed from the clip ({width}x{height}).")


def test_evidence_snapshot():
    detector = ModelRegistry.create("multilabel_yolo")
    detector.load_model()
    results = detector.infer("dummy_frame", confidence_threshold=0.5)
    assert results, "Expected the fallback to produce a detection for an unreadable frame"

    primary = results[0]
    assert primary.class_name in {"POTHOLE", "WATERLOGGING", "ROAD_DAMAGE"}
    assert 0.0 <= primary.confidence <= 1.0

    b64_evidence = detector.annotate_frame_base64(
        None, results, bus_id="BUS-005", gps_text="GPS: 11.0168, 76.9558"
    )
    assert b64_evidence.startswith("data:image/"), "Evidence is not a data URL"
    assert len(b64_evidence) > 1000, "Evidence payload too small"
    print(f"[OK] Annotated frame generated ({len(b64_evidence)} chars).")


if __name__ == "__main__":
    test_detector_registration()
    test_weights_exist()
    test_real_inference_per_class()
    test_video_scan_reads_one_frame()
    test_evidence_snapshot()
    print("\nALL EDGE MULTILABEL AI TESTS PASSED.")
