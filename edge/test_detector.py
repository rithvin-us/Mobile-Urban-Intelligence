"""
Unit & Integration Test for Edge AI Multilabel Road Defect Detector
"""

import os
import sys

# Add root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from edge.inference.model_registry import ModelRegistry
from edge.inference.multilabel_detector import MultilabelYoloDetector


def test_detector_registration():
    detector = ModelRegistry.create("multilabel_yolo")
    assert isinstance(detector, MultilabelYoloDetector), "Failed to instantiate MultilabelYoloDetector"
    print("[OK] Detector registration test passed.")


def test_weights_exist():
    weights_path = os.path.join(os.path.dirname(__file__), "inference", "models", "multilabel_best.pt")
    assert os.path.exists(weights_path), f"Weights not found at {weights_path}"
    assert os.path.getsize(weights_path) > 6000000, f"Weights file size unexpected: {os.path.getsize(weights_path)}"
    print(f"[OK] Weights verified ({os.path.getsize(weights_path)} bytes).")


def test_inference_and_evidence():
    detector = ModelRegistry.create("multilabel_yolo")
    detector.load_model()
    results = detector.infer("dummy_frame", confidence_threshold=0.5)
    assert len(results) > 0, "Expected at least one detection result"
    
    primary = results[0]
    assert primary.class_name in ["POTHOLE", "WATERLOGGING", "ROAD_DAMAGE"], f"Unexpected class {primary.class_name}"
    assert 0.0 <= primary.confidence <= 1.0, f"Invalid confidence: {primary.confidence}"
    print(f"[OK] Detection test passed: [{primary.class_name}] (Confidence: {primary.confidence*100:.1f}%)")

    # Verify Base64 optical snapshot generation
    b64_evidence = detector.annotate_frame_base64(None, results, bus_id="BUS-005", gps_text="GPS: 11.0168, 76.9558")
    assert b64_evidence.startswith("data:image/jpeg;base64,"), "Evidence is not valid base64 data URL"
    assert len(b64_evidence) > 1000, "Evidence payload too small"
    print(f"[OK] Optical frame evidence snapshot generated ({len(b64_evidence)} chars).")


if __name__ == "__main__":
    test_detector_registration()
    test_weights_exist()
    test_inference_and_evidence()
    print("\nALL EDGE MULTILABEL AI TESTS PASSED SUCCESSFULLY!")
