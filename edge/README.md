# Edge AI System (Jetson Architecture Interface)

This directory defines the hardware interface and edge component structure for the Nvidia Jetson onboard processing platform.

## Architecture & Data Flow

```
+-----------------------------------------------------------------------+
|                             NVIDIA JETSON                             |
|  +-------------------+   +-------------------+   +-----------------+  |
|  | Cameras & NMEA GPS|-->| Inference & Track |-->| Event Engine    |  |
|  +-------------------+   +-------------------+   +-----------------+  |
+-----------------------------------------------------------|-----------+
                                                            | HTTPS POST
                                                            v
                                                  +-------------------+
                                                  | FastAPI Backend   |
                                                  +-------------------+
```

## Module Structure

- **`inference/`**: Object detection models (YOLO / TensorRT) for road damage, potholes, traffic signs, and zebra crossings.
- **`tracking/`**: Object tracking algorithms (DeepSORT / ByteTrack) to prevent double counting across consecutive camera frames.
- **`gps/`**: NMEA GPS hardware reader providing real-time bus lat/long, speed, and heading.
- **`event_engine/`**: Event triggering rules that aggregate detections, compute confidence, and serialize events for API submission.

## Replacement Contract

The edge system posts telemetry and events directly to the centralized FastAPI backend via:
- `POST /api/buses/telemetry`
- `POST /api/events`

No changes to backend models, schemas, or database tables are required when transitioning from the simulator to live Jetson edge devices.
