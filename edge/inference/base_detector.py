from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class BoundingBox(BaseModel):
    xmin: float
    ymin: float
    xmax: float
    ymax: float

class DetectionResult(BaseModel):
    class_name: str         # e.g., 'POTHOLE', 'ROAD_DAMAGE', 'TRAFFIC', 'WATERLOGGING'
    confidence: float       # 0.0 to 1.0
    bbox: BoundingBox
    metadata: Optional[Dict[str, Any]] = None

class BaseDetector(ABC):
    """
    Abstract Base Class for Edge AI Detectors.
    Allows easy swapping between TensorRT, ONNX Runtime, OpenVINO, or PyTorch models.
    """

    @abstractmethod
    def load_model(self, model_path: str, **kwargs) -> bool:
        """Loads model weights/engine file into memory."""
        pass

    @abstractmethod
    def infer(self, frame_data: Any, confidence_threshold: float = 0.75) -> List[DetectionResult]:
        """Runs inference on frame input data and returns standardized list of detections."""
        pass
