# Bus & Event Telemetry Simulator

The simulator mimics 10 public transit buses continuously transmitting GPS telemetry and object detection events over HTTP to the FastAPI backend.

## Structure
- `buses/manager.py`: Manages state and GPS coordinates of 10 simulated buses across 3 urban transit routes.
- `gps/interpolator.py`: Performs coordinate interpolation and heading calculations.
- `events/generator.py`: Generates randomized detection events (`POTHOLE`, `ROAD_DAMAGE`, `WATERLOGGING`, `TRAFFIC`, `INCIDENT`, etc.).
- `main.py`: Main loop posting telemetry (`POST /api/buses/telemetry`) and events (`POST /api/events`).

## Usage
Ensure the FastAPI backend is running at `http://localhost:8000`.

To run indefinitely:
```bash
python simulator/main.py
```

To run for a specific duration (e.g., 30 seconds):
```bash
python simulator/main.py 30
```
