# SIH26124 - AI-Powered Onboard + Centralized Urban Sensing Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%2B-000000?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20PostGIS%203.4-336791?style=flat&logo=postgresql)](https://postgis.net/)
[![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=flat&logo=redis)](https://redis.io/)
[![NVIDIA Jetson](https://img.shields.io/badge/NVIDIA-Jetson%20Orin-76B900?style=flat&logo=nvidia)](https://developer.nvidia.com/embedded/jetson-orin)

An enterprise-grade, edge-to-cloud AI urban sensing platform that leverages public transport bus fleets for real-time road condition monitoring, traffic anomaly detection, and municipal infrastructure analytics.

---

## 🏗️ Architecture Overview

The platform uses a decoupled edge-central architecture. Central FastAPI backends receive real-time telemetry and object detection events over standard REST/MQTT endpoints, making edge processing units (NVIDIA Jetson) fully interchangeable with the telemetry simulation suite.

```
+-----------------------------------------------------------------------------------+
|                                  DATA PRODUCERS                                   |
|  +------------------------------+            +---------------------------------+  |
|  | Simulated Bus Fleet          |     OR     | NVIDIA Jetson Edge AI Platform  |  |
|  | (10 buses, routes, GPS streams) |            | (YOLO, DeepSORT, NMEA GPS)      |  |
|  +------------------------------+            +---------------------------------+  |
+----------------------------------\----------/-------------------------------------+
                                    \        /
                           HTTP POST \      / HTTP POST
                            Telemetry \    /  Events
                                       v  v
+-----------------------------------------------------------------------------------+
|                                CENTRALIZED BACKEND                                |
|  +-----------------------------------------------------------------------------+  |
|  | FastAPI REST Engine (Port 8000)                                             |  |
|  |  ├── GET  /health                                                           |  |
|  |  ├── GET  /api/buses & /api/buses/{id}                                      |  |
|  |  ├── POST /api/buses/telemetry                                              |  |
|  |  ├── GET  /api/events & /api/events/{id}                                    |  |
|  |  └── POST /api/events                                                       |  |
|  +-----------------------------------------------------------------------------+  |
|                                     |                                             |
|               PostgreSQL + PostGIS (Port 5432) | Redis Cache (Port 6379)           |
+-------------------------------------|---------------------------------------------+
                                      v
+-----------------------------------------------------------------------------------+
|                                DASHBOARD FRONTEND                                 |
|  +-----------------------------------------------------------------------------+  |
|  | Next.js 14 + React 18 + Tailwind CSS + Google Maps GIS Engine (Port 3000)    |  |
|  |  ├── Live Interactive Map (Bus markers, heading, polylines)                 |  |
|  |  ├── Real-time Road Anomaly Stream & Severity Badges                        |  |
|  |  └── Municipal Analytics & Fleet Health Breakdown                           |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 🔌 External Source Requirements

To deploy and operate the system in a production or live hardware environment, the following hardware, software, and driver components are required:

### 1. Edge Hardware & Onboard Sensors (Bus Fleet)
* **Processing Unit**: NVIDIA Jetson Orin Nano (8GB) / Orin NX / Xavier NX (ARM64 architecture) running NVIDIA JetPack SDK.
* **Camera Sensors**: 1080p / 4K USB or CSI Optical Cameras (minimum 30 FPS, wide dynamic range) mounted behind bus windshields for front-facing road views.
* **GPS Receiver**: NMEA-0183 compliant GNSS/GPS Receiver module (e.g., u-blox NEO-M8N or USB GNSS Dongle) connected via serial (`/dev/ttyUSB0` or `/dev/ttyTHS1`).
* **Telematics Gateway**: 4G LTE / 5G Cellular Modem (e.g., Quectel EC25 or SIM7600) with active M2M SIM card for real-time cloud data transmission.

### 2. Edge Software & Framework Dependencies
* **Operating System**: NVIDIA JetPack 5.1+ / 6.x (Ubuntu 20.04/22.04 LTS based L4T).
* **AI & Computer Vision**:
  * CUDA 11.8/12.2 & cuDNN 8.x
  * TensorRT 8.6+ (for compiling `.onnx` models into high-throughput FP16/INT8 `.engine` models)
  * OpenCV (compiled with CUDA acceleration)
  * PyTorch / ONNX Runtime
  * ByteTrack / DeepSORT tracking modules
* **Python Edge Libraries**: `pynmea2`, `pyserial`, `httpx` / `requests`.

### 3. Cloud Central Backend Infrastructure
* **Runtime**: Python 3.10+
* **Framework**: FastAPI 0.110+, Uvicorn / Gunicorn WSGI.
* **Spatial Database**: PostgreSQL 16 with **PostGIS 3.4** extension enabled for indexing geographic coordinates (`GEOMETRY(Point, 4326)`), spatial bounding box queries, and route proximity matching.
* **In-Memory Store**: Redis 7.x (for sub-second fleet coordinate caching, rate limiting, and event Pub/Sub).
* **Python Dependencies**: `sqlalchemy>=2.0.28`, `geoalchemy2>=0.14.7`, `psycopg2-binary>=2.9.9`, `pydantic-settings>=2.2.1`, `httpx>=0.27.0`.

### 4. Dashboard Frontend Stack
* **Runtime**: Node.js v18.x or v20.x LTS, `pnpm` (v8+).
* **Framework**: Next.js 14 (App Router), React 18, TypeScript 5.4.
* **UI Libraries**: Tailwind CSS, Lucide React, shadcn/ui components.
* **Mapping & Charts**: `@vis.gl/react-google-maps` (v1.5+), Recharts (v2.12+).

---

## 🚀 Deployment Strategies

### Strategy A: Edge Fleet Deployment (NVIDIA Jetson Onboard Units)

#### Option 1: Containerized Fleet Deployment (Recommended for Scale)
* Package edge application into a lightweight ARM64 Docker container based on `nvcr.io/nvidia/l4t-ml`.
* Deploy and manage containers across bus fleets using **balenaCloud**, **Azure IoT Edge**, or **AWS IoT Greengrass**.
* Benefits: Provides centralized fleet monitoring, remote health checks, automated container restarts, and over-the-air (OTA) updates.

#### Option 2: Native Systemd Service (Bare-Metal Setup)
* Install Python dependencies and TensorRT runtimes directly on JetPack OS.
* Register the edge pipeline as a system daemon (`/etc/systemd/system/urban-edge.service`):
  ```ini
  [Unit]
  Description=Urban Intelligence Edge Processing Engine
  After=network.target

  [Service]
  ExecStart=/usr/bin/python3 /opt/urban-edge/main.py
  Restart=always
  User=root

  [Install]
  WantedBy=multi-user.target
  ```
* **Offline Resilience**: Implement local SQLite/RocksDB buffer on the Jetson SD card/NVMe drive to store telemetry and detected events when cellular signal drops, flushing to central API automatically upon reconnection.

---

### Strategy B: Central Backend & Database Infrastructure

#### Option 1: Self-Hosted Docker Stack (Single VM Deployment)
* Suitable for pilot deployments on AWS EC2 (t3.xlarge / c6i.xlarge), GCP Compute Engine, or Hetzner VPS.
* Execute `docker-compose up -d` to launch PostgreSQL/PostGIS, Redis, and FastAPI services in isolated containers.
* Place an Nginx or Caddy reverse proxy in front for TLS termination (HTTPS / Let's Encrypt).

#### Option 2: Enterprise Cloud Managed Stack (High Availability & Scale)
* **Backend API**: Deploy FastAPI app to **AWS ECS (Fargate)** or **GCP Cloud Run** with horizontal auto-scaling based on HTTP request volume.
* **Spatial Database**: Deploy to **AWS RDS PostgreSQL** (or GCP Cloud SQL) with `postgis` extension enabled, multi-AZ failover, and automated spatial snapshots.
* **Cache**: Deploy to **AWS ElastiCache for Redis** for high-throughput in-memory state management.

---

### Strategy C: Frontend Dashboard Deployment

#### Option 1: Managed Serverless Platform (Vercel / Netlify)
* Connect repository to **Vercel**.
* Configure root build settings for `apps/web` (Framework: Next.js).
* Set environment variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in project settings.

#### Option 2: Dockerized Standalone Container
* Enable Next.js standalone build in `apps/web/next.config.js` (`output: 'standalone'`).
* Containerize and deploy to any container platform or Kubernetes cluster behind Nginx.

---

### Strategy D: CI/CD & Model OTA Pipeline
* **Continuous Integration**: GitHub Actions workflow executing code formatting, `pytest` API suites, TypeScript type checks (`tsc --noEmit`), and Docker build tests.
* **Over-The-Air (OTA) Model Deployment**: Host compiled TensorRT model weights (`.engine` files) in secure cloud storage (AWS S3 / Cloudflare R2). Edge units check for model updates on startup via MQTT / HTTP endpoints and download updated weights without physical vehicle maintenance.

---

## 🔑 API Keys & Required Credentials

| Environment Variable | Service Provider | Description & Scope | Required Level |
|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Platform | Google Maps JavaScript API key used by Next.js frontend (`apps/web/components/map/google_map.tsx`) to render maps, bus markers, and route vectors. Requires *Maps JavaScript API*, *Directions API*, and *Geocoding API* enabled in GCP Console. | **Required** |
| `DATABASE_URL` | PostgreSQL + PostGIS | Database connection URI (e.g., `postgresql://postgres:postgres@localhost:5432/urban_intelligence`). | **Required** |
| `REDIS_URL` | Redis | Redis connection string (e.g., `redis://localhost:6379/0`). | **Required** |
| `OPENWEATHERMAP_API_KEY` | OpenWeather API | *(Recommended Extension)* Used to fetch real-time precipitation and weather conditions to correlate with road defect events (e.g., waterlogging, potholes). | *Recommended* |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio SMS API | *(Recommended Extension)* Used by central backend to trigger urgent SMS alerts to city engineers when severe hazards are detected. | *Recommended* |
| `TELEGRAM_BOT_TOKEN` / `SLACK_WEBHOOK_URL` | Telegram / Slack | *(Recommended Extension)* Webhook credentials for streaming critical defect alerts directly into municipal dispatch channels. | *Recommended* |
| `SENTRY_DSN` | Sentry.io | *(Enterprise Extension)* Exception monitoring and latency tracking for edge nodes and backend endpoints. | *Optional* |
| `AWS_IOT_ENDPOINT` & Certs | AWS IoT Core | *(Enterprise Extension)* X.509 certificates and MQTT endpoint for encrypted edge-to-cloud telematic transport. | *Optional* |

---

## 📂 Directory Structure

```
urban-intelligence/
├── apps/
│   ├── web/                     # Next.js 14 Frontend Dashboard (Port 3000)
│   │   ├── app/                 # Next.js App Router pages & dashboard
│   │   ├── components/          # Google Maps GIS, Stat cards, Analytics charts
│   │   └── lib/                 # REST API client & helpers
│   └── api/                     # FastAPI Python Backend Service (Port 8000)
│       ├── app/                 # Routers, SQLAlchemy models, schemas, services
│       ├── tests/               # Pytest test suite
│       ├── Dockerfile           # Backend container build specification
│       └── requirements.txt     # Python backend dependencies
├── edge/                        # Jetson AI module architecture & specs
│   ├── inference/               # TensorRT / YOLO object detection specifications
│   ├── tracking/                # DeepSORT / ByteTrack tracking specifications
│   ├── gps/                     # NMEA GPS serial parsing specifications
│   └── event_engine/            # Defect thresholding & HTTP payload serializer
├── simulator/                   # Bus Fleet & Event Telemetry Simulator
│   ├── buses/                   # Bus route motion simulator
│   ├── events/                  # Random anomaly event generator
│   └── main.py                  # Telemetry runner script
├── packages/                    # Monorepo shared packages (types, configs)
├── infrastructure/              # Database scripts & Docker configurations
│   └── postgres/init.sql        # PostGIS extension initialization
├── .env.example                 # Environment configuration template
├── docker-compose.yml           # Postgres/PostGIS, Redis, API container stack
└── README.md                    # Project documentation
```

---

## ⚡ Local Quickstart & Development Setup

### Prerequisites
* **Node.js**: v18.x or v20.x LTS & `pnpm`
* **Python**: 3.10+
* **Docker Engine** & **Docker Compose**

### Step 1: Environment Setup
Copy `.env.example` to generate root `.env` and frontend `.env.local`:
```bash
cp .env.example .env
cp .env.example apps/web/.env.local
```
Add your Google Maps API Key to `apps/web/.env.local`:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
```

### Step 2: Start PostGIS & Redis (Docker)
```bash
docker-compose up -d postgres redis
```

### Step 3: Start Central Backend (FastAPI)
```bash
cd apps/api
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\activate

# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Interactive API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### Step 4: Run Telemetry Simulator
In a separate terminal window:
```bash
python simulator/main.py
```
This spawns 10 simulated buses moving along predefined city routes, continuously sending GPS telemetry and detecting simulated road anomalies (potholes, waterlogging, traffic incidents).

### Step 5: Start Frontend Dashboard (Next.js)
```bash
# Install monorepo dependencies
pnpm install

# Start Next.js development server
pnpm --filter web dev
```
Open your browser and navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

---

## 🧪 Testing & DevOps CI/CD Workflows

### 1. GitHub Actions Workflows (`.github/workflows/`)
- **Continuous Integration (`.github/workflows/ci.yml`)**: Automated CI pipeline triggered on `push` and `pull_request` to `main`/`master` branches:
  - **Backend Job**: Spins up PostgreSQL + PostGIS (`postgis/postgis:16-3.4-alpine`) & Redis service containers, installs requirements, executes `pytest` suite, and checks test coverage.
  - **Frontend Job**: Executes TypeScript type-checking (`pnpm --filter web type-check`) and Next.js production build tests (`pnpm --filter web build`).
  - **Simulator Verification**: Runs a 10-second end-to-end telemetry simulator test step against the FastAPI engine.
  - **Docker Build Check**: Validates `apps/api/Dockerfile` container image build.
- **Continuous Deployment (`.github/workflows/cd.yml`)**: Automated Docker container image build and release to GitHub Container Registry (`ghcr.io`) upon tagging a release (`v*.*.*`).

### 2. Local Git Pre-Commit & Pre-Push Hooks (`.githooks/`)
Enable local developer git hooks to catch errors before committing or pushing code:
```bash
python scripts/setup-hooks.py
```
- **Pre-Commit Hook**: Automatically runs Next.js TypeScript type check before allowing git commits.
- **Pre-Push Hook**: Automatically runs the FastAPI Pytest test suite before allowing git pushes.

### 3. Automated Test Execution
Run the Python backend pytest test suite locally:
```bash
cd apps/api
python -m pytest
```

Run frontend type checking locally:
```bash
pnpm --filter web type-check
```

