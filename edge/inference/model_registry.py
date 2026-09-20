import logging
from typing import Dict, Type, Optional
from edge.inference.base_detector import BaseDetector

logger = logging.getLogger(__name__)

class ModelRegistry:
    """
    Registry pattern for dynamically registering and instantiating edge AI models.
    Enables zero-code-change model swapping via configuration strings.
    """
    _registry: Dict[str, Type[BaseDetector]] = {}

    @classmethod
    def register(cls, model_type_name: str):
        """Decorator to register a detector class under a given type name."""
        def decorator(subclass: Type[BaseDetector]):
            cls._registry[model_type_name.lower()] = subclass
            return subclass
        return decorator

    @classmethod
    def create(cls, model_type_name: str, model_path: Optional[str] = None, **kwargs) -> BaseDetector:
        """Instantiates and initializes a registered detector model."""
        key = model_type_name.lower()
        if key not in cls._registry:
            raise ValueError(f"Unknown detector model type '{model_type_name}'. Available: {list(cls._registry.keys())}")
        
        detector_cls = cls._registry[key]
        instance = detector_cls()
        if model_path:
            instance.load_model(model_path, **kwargs)
        logger.info(f"Successfully created and initialized detector: '{key}'")
        return instance

class MockDetector(BaseDetector):
    """Fallback Mock Detector for testing pipeline without physical AI weights."""
    def load_model(self, model_path: str, **kwargs) -> bool:
        return True

    def infer(self, frame_data: any, confidence_threshold: float = 0.75) -> list:
        return []

# Register mock detector by default
ModelRegistry._registry["mock"] = MockDetector


def _register_builtin_detectors() -> None:
    """
    Imports the detectors that register themselves by decorator.

    Without this, `ModelRegistry.create("multilabel_yolo")` only worked if the
    caller happened to have imported the module first, so the registry raised
    "Unknown detector model type" depending on import order.
    """
    try:
        import edge.inference.multilabel_detector  # noqa: F401
    except Exception as exc:  # pragma: no cover - depends on optional deps
        logger.debug("Multilabel detector unavailable: %s", exc)


_register_builtin_detectors()
