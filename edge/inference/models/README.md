# Edge AI Model Directory

This directory is designated for storing compiled model weight files (`.engine`, `.onnx`, `.pt`, `.tflite`).

## Model Swapping & Drop-In Instructions

When your trained Pothole, Road Damage, or Traffic models are ready:

1. **Place Model Weights**:
   Drop your compiled TensorRT or ONNX file here:
   - `edge/inference/models/pothole_detector_v1.engine`
   - `edge/inference/models/traffic_detector_v1.engine`

2. **Register Custom Detector**:
   Implement a subclass of `BaseDetector` in `edge/inference/custom_detector.py` and decorate it with `@ModelRegistry.register("your_model_name")`:

   ```python
   from edge.inference.base_detector import BaseDetector, DetectionResult
   from edge.inference.model_registry import ModelRegistry

   @ModelRegistry.register("yolov8_tensorrt")
   class YOLOv8TensorRTDetector(BaseDetector):
       def load_model(self, model_path: str, **kwargs) -> bool:
           # Load TensorRT engine using pycuda & tensorrt bindings
           return True

       def infer(self, frame_data, confidence_threshold=0.75):
           # Run TensorRT GPU inference
           return []
   ```

3. **Select Active Detector**:
   In your edge configuration (`edge/config.json` or `.env`):
   ```env
   ACTIVE_MODEL_TYPE=yolov8_tensorrt
   MODEL_WEIGHTS_PATH=edge/inference/models/pothole_detector_v1.engine
   ```

The Edge Event Engine will automatically route camera frames through the registered model without any changes to the FastAPI backend or Next.js dashboard.
