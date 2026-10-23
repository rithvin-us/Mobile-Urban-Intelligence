<div align="center">

# Mobile Urban Intelligence

**Turning public transport fleets into a continuous road condition sensor network.**

[![CI](https://github.com/rithvin-us/Mobile-Urban-Intelligence/actions/workflows/ci.yml/badge.svg)](https://github.com/rithvin-us/Mobile-Urban-Intelligence/actions/workflows/ci.yml)
[![CD](https://github.com/rithvin-us/Mobile-Urban-Intelligence/actions/workflows/cd.yml/badge.svg)](https://github.com/rithvin-us/Mobile-Urban-Intelligence/actions/workflows/cd.yml)
[![Release](https://img.shields.io/github/v/release/rithvin-us/Mobile-Urban-Intelligence?sort=semver)](https://github.com/rithvin-us/Mobile-Urban-Intelligence/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostGIS](https://img.shields.io/badge/PostgreSQL%2016-PostGIS%203.4-336791?logo=postgresql&logoColor=white)](https://postgis.net/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Jetson](https://img.shields.io/badge/NVIDIA-Jetson%20Orin-76B900?logo=nvidia&logoColor=white)](https://developer.nvidia.com/embedded/jetson-orin)
[![MATLAB](https://img.shields.io/badge/MATLAB-R2026b%20%2B%20Simulink-0076A8?logo=mathworks&logoColor=white)](https://www.mathworks.com/)

</div>

---

## The problem

Municipal road inspection is manual, scheduled, and slow. A pothole is typically
found by a complaint, weeks after it formed, after it has already damaged
vehicles. Meanwhile city buses drive every arterial road several times a day and
sense nothing.

Streaming their dashcam video to the cloud is not the answer either: raw 1080p
from a fleet over LTE is prohibitively expensive, and the decision needs to
happen in milliseconds. So the inference runs onboard, and only metadata
crosses the network.

## What this does

A bus becomes a sensor node. An NVIDIA Jetson behind the windshield runs YOLOv8
over the camera feed, classifies road hazards, geotags them against RTK GNSS,
and posts only the resulting event payloads to a PostGIS backend. A Next.js
operations dashboard shows the fleet live and merges repeated sightings of the
same defect into verified municipal work orders.

| Capability | Status |
| :--- | :--- |
| Onboard multi-class hazard detection (YOLOv8) | Working, trained weights included |
| Potholes, cracks, waterlogging, signage, zebra crossings, pedestrian risk | 6 classes |
| Spatio-temporal defect clustering into work orders | Working |
| Live operator dashboard with GPU-accelerated map | Working |
| 3D vehicle digital twin with sensor breakdown | Working |
| Real-time WebSocket fleet stream | Working (dashboard currently polls) |
| Physics validation in MATLAB and Simulink | Working |

---

## Architecture

```
┌──────────────────────── ONBOARD EDGE UNIT (per bus) ─────────────────────────┐
│                                                                              │
│   Sony STARVIS camera ──▶ Jetson Orin Nano ──▶ ByteTrack ──▶ Event engine    │
│   1080p 60 FPS            TensorRT YOLOv8      tracking      severity grade  │
│                                   ▲                              │           │
│   u-blox ZED-F9P GNSS ────────────┘                              │           │
│   RTK, 20 Hz                                                     ▼           │
│                                                     SQLite store-and-forward │
└──────────────────────────────────────────────────────────┬───────────────────┘
                                                           │ HTTPS over 4G/5G
                                                           │ metadata only
                                                           ▼
┌─────────────────────────── CENTRAL BACKEND ──────────────────────────────────┐
│   FastAPI ingestion  ·  PostgreSQL 16 + PostGIS 3.4  ·  Redis 7              │
│   REST + WebSocket fan-out  ·  spatial defect clustering  ·  health telemetry │
└──────────────────────────────────────────────────────────┬───────────────────┘
                                                           │
                                                           ▼
┌────────────────────────── OPERATOR DASHBOARD ────────────────────────────────┐
│   Next.js 14 · deck.gl GPU map · Three.js digital twin · evidence viewer      │
└──────────────────────────────────────────────────────────────────────────────┘
```

Edge units and the bundled fleet simulator are interchangeable: both speak the
same REST contract, so the whole platform can be demonstrated without hardware.

---

## Quick start

Needs Docker, Python 3.10+, and Node 20 with pnpm 8+.

```sh
# 1. Spatial database and cache
docker compose up -d postgres redis

# 2. Backend
python -m venv .venv && . .venv/bin/activate
pip install -r apps/api/requirements.txt
cp .env.example .env                           # set DEMO_MODE=1 for a self-driving demo
cd apps/api && uvicorn app.main:app --port 8000

# 3. Dashboard
pnpm install
cp apps/web/.env.example apps/web/.env.local   # add your Google Maps API key
pnpm --filter web dev
```

Open <http://localhost:3000/dashboard>.

> The dashboard needs a real `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Without one the
> map panel renders an error and the rest of the interface still works.

With `DEMO_MODE=1` the API drives the 24-bus fleet itself. To feed it from the
standalone simulator instead, leave `DEMO_MODE=0` and run `python simulator/main.py`.

---

## API

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/health` | Liveness, also answers `HEAD` |
| `GET` | `/health/system` | Pipeline status: database, ingest freshness, counts |
| `GET` | `/api/buses` | Fleet snapshot |
| `GET` | `/api/buses/{bus_id}` | One vehicle |
| `POST` | `/api/buses/telemetry` | Telemetry ingest, one vehicle |
| `POST` | `/api/buses/telemetry/batch` | Telemetry ingest, batched |
| `POST` | `/api/buses/reset-fleet` | Reseed the regional fleet |
| `GET` | `/api/events` | Hazard events, filter by type and status |
| `GET` | `/api/events/{event_id}` | One event |
| `POST` | `/api/events` | Hazard event ingest |
| `PATCH` | `/api/events/{event_id}/status` | Acknowledge or resolve |
| `GET` | `/api/events/clusters` | Defects merged into verified work orders |
| `WS` | `/api/ws/fleet` | Live `FLEET_UPDATE` and `EVENT_ALERT` stream |

Interactive documentation is at `/docs` once the backend is running.

---

## Validation

Detection accuracy is not asserted, it is measured. `matlab sims/` contains a
physics model that generates a road, drives a bus over it, and scores the
detector against ground truth it controls.

`pothole_imu_sim.m` synthesises an ISO 8608 road profile, injects potholes,
cracks and speed breakers at known positions, runs a 2-DOF bus quarter-car model
to produce the vertical acceleration an onboard IMU would record, grades the
corridor with the ASTM E1926 golden car, then detects and scores:

```
IRI = 9.23 m/km (severely distressed)
IMU-detectable classes: precision 0.800 | recall 1.000 | F1 0.889
  pothole           15 present, 15 found, recall 1.00
  speed breaker      5 present,  5 found, recall 1.00
  transverse crack  20 present,  4 found, recall 0.20
```

That last row is the useful one. An accelerometer cannot reliably feel a 2 cm
crack, because the tyre contact patch bridges it. **This is the quantified
reason the platform leads with a camera rather than a cheap inertial sensor**,
and it is reported rather than averaged into a flattering headline.

Two Simulink models accompany it. `quarter_car_model.slx` models ride dynamics
and independently reproduces the script's result — 0.137 g RMS chassis
acceleration against the script's 0.134 g, from a separate implementation.
`edge_pipeline_latency.slx` models the sensing chain stage by stage and puts the
glass-to-dashboard budget at **130 ms**, of which the LTE uplink alone is 85 ms.
That is the quantitative case for inferring onboard instead of streaming video.

Both models are generated by `build_models.m` and verified by `run_models.m`,
so they are reproducible rather than opaque binaries. See
[`matlab sims/README.md`](matlab%20sims/README.md).

---

## Repository layout

```
apps/
  api/                 FastAPI backend, PostGIS persistence, WebSocket fan-out
  web/                 Next.js 14 operator dashboard
edge/
  inference/           YOLOv8 multi-label detector and model registry
  event_engine/        SQLite store-and-forward buffer for offline resilience
  data/                Sample dashcam footage and frames
  vendor/              Platform-specific codec libraries
simulator/             Synthetic fleet telemetry producer
matlab sims/           MATLAB scripts and Simulink models
packages/              Shared TypeScript config and types
infrastructure/        Database initialisation SQL
docs/                  Architecture, deployment, design brief, audit
scripts/               Developer tooling
.github/workflows/     CI, container release, versioned release
```

---

## Testing

```sh
ruff check apps/api --ignore E501      # backend lint
cd apps/api && pytest                  # backend suite
pnpm --filter web type-check           # dashboard types
pnpm --filter web build                # dashboard production build
pytest edge/test_detector.py           # edge AI against the real weights
```

CI runs the backend suite against live PostGIS and Redis service containers,
type-checks and builds the dashboard, exercises the simulator against a running
API, and builds the backend container image. Tagging `v*.*.*` publishes a
GitHub Release and pushes multi-architecture images to GHCR.

---

## Documentation

- [Project summary and technical specification](docs/PROJECT_SUMMARY.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Dashboard design brief](docs/DASHBOARD_DESIGN_BRIEF.md)
- [Audit and roadmap](docs/AUDIT_AND_ROADMAP.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE).
