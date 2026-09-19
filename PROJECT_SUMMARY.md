# Mobile Urban Intelligence (Edge AI Fleet Management & Autonomous Road Telemetry)

## Comprehensive Technical Summary & Architecture Specification

---

## 1. Executive Summary & Industry Context

**Mobile Urban Intelligence** is an enterprise-grade Edge AI fleet management and spatio-temporal road infrastructure audit platform. Designed for municipal public transit networks (featuring the **Bharat Bus AV** fleet), the platform converts standard urban transit buses into continuous, autonomous mobile sensor nodes. 

By equipping transit vehicles with high-frame-rate optical sensors and onboard edge AI processing units, the system automatically detects, classifies, and geolocates urban road hazards—such as potholes, longitudinal cracking, waterlogging, missing signage, and pedestrian risks—in real time. Telemetry and anomaly reports are ingested by a PostGIS-backed central control dashboard, empowering municipal authorities to transition from costly, reactive road repair cycles to predictive, data-driven infrastructure maintenance.

---

## 2. Detailed Problem Statement

### 2.1 The Municipal Infrastructure Deficit
1. **Slow, Reactive Hazard Detection**:
   - Traditional municipal road inspection relies heavily on manual field surveys, scheduled inspection crews, or delayed public complaints.
   - Hazardous defects (e.g., severe potholes, washed-out road shoulders, waterlogging) often persist for weeks before discovery, resulting in vehicle damage, traffic congestion, and severe public safety risks.

2. **Underutilized Transit Capital**:
   - Municipal public transit buses traverse every major arterial road and secondary corridor multiple times daily, logging millions of cumulative kilometers.
   - Traditionally, these vehicles serve solely as passenger carriers, missing the opportunity to act as continuous spatial mapping units.

3. **High Latency & High Bandwidth Cloud Bottlenecks**:
   - Streaming raw, uncompressed 1080p/4K video feeds from dozens of buses over cellular networks to central cloud servers is cost-prohibitive and bandwith-inefficient.
   - Decision-making requires onboard real-time inference (Edge AI) so that only metadata payloads, bounding box telemetry, and compressed event frames are transmitted over LTE/5G networks.

### 2.2 Telemetry & Front-End UX Engineering Challenges
1. **Raw GPS Drift & Off-Road Mapping Errors**:
   - Consumer and standard fleet GPS receivers experience multipath interference and atmospheric latency, causing coordinate drift. Uncorrected coordinates place vehicles inside buildings or off-road, degrading operator trust.
2. **UI State Loss During Auto-Refresh**:
   - Standard dashboard auto-refresh patterns fetch fresh telemetry periodically. When network delays or transient HTTP errors occur, naive state-setter logic wipes the active map markers, active modals, and alert cards, causing screen blanking and jarring UI flickering.
3. **Modal Overcrowding & Context Disruption**:
   - Opening full-page detail views disrupts an operator's active overview of the city map. Telemetry detail views, 3D digital twins, camera streams, and evidence frames must remain compact, responsive popups overlaying the main operational map.

---

## 3. End-to-End System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                      ONBOARD VEHICLE EDGE UNIT                                    |
|  +------------------------+  +----------------------------------+  +---------------------------+  |
|  | Sony STARVIS Camera    |  | NVIDIA Jetson Orin Nano (8GB)    |  | u-blox ZED-F9P GNSS       |  |
|  | 1080p 60FPS WDR Optical|  | TensorRT YOLOv8 + ByteTrack AI   |  | RTK 20Hz Telemetry        |  |
|  +-----------+------------+  +----------------+-----------------+  +-------------+-------------+  |
+--------------|--------------------------------|----------------------------------|----------------+
               |                                | Metadata Payload                 | GPS Coordinates
               +--------------------------------v----------------------------------+
                                                | MQTT / HTTPS via 5G Telematics
                                                v
+---------------------------------------------------------------------------------------------------+
|                                  CENTRAL CONTROL & BACKEND LAYER                                  |
|  +---------------------------------------------------------------------------------------------+  |
|  | FastAPI Telemetry Ingestion Engine & REST API                                               |  |
|  | PostGIS Spatio-Temporal Database Storage                                                    |  |
|  | Health & Uptime Subsystem (/health GET/HEAD)                                                |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
                                                ▲
                                                | Auto-Refresh Polling / WebSockets
                                                v
+---------------------------------------------------------------------------------------------------+
|                                    OPERATOR CONTROL DASHBOARD                                     |
|  +---------------------------------------------------------------------------------------------+  |
|  | Next.js 15 • React 19 • TypeScript • Tailwind CSS                                           |  |
|  | 60 FPS Mapbox / Google Maps Engine with RoadSnapper Polyline Interpolation                    |  |
|  | 3D Bharat Bus Digital Twin (Three.js WebGL + ResizeObserver + Procedural Fallback)            |  |
|  | Multi-View Compact Modal Overlay (3D Twin | Live AI Dashcam | Google Street View)             |  |
|  | Inline Evidence Popup Modal (<EvidenceModal />)                                             |  |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Hardware & Sensor Specs (Bharat Bus AV Platform)

The 3D Digital Twin (`apps/web/components/3d/bus_model_viewer.tsx`) maps five critical hardware sensor nodes directly on the vehicle chassis:

| Sensor ID | Sensor Name | Hardware Specifications | Operational Function |
| :--- | :--- | :--- | :--- |
| **`front-cam`** | **Front Optical AI Camera** | Sony STARVIS IMX335 • 120° FOV • HDR • CSI-2 Interface | Captures high-frame-rate road surface video for visual anomaly detection. |
| **`edge-compute`** | **NVIDIA Jetson Orin Edge Unit** | NVIDIA Jetson Orin Nano (8GB) • 40 TOPS • INT8 Engine • 15W TDP | Executes TensorRT compiled YOLOv8 detection & ByteTrack multi-object tracking onboard. |
| **`gps-receiver`** | **Roof NMEA GNSS / GPS Antenna** | u-blox ZED-F9P • RTK Capable • 20Hz Update Rate | Streams precision spatial telemetry (latitude, longitude, speed, heading). |
| **`telematics-gateway`** | **4G LTE / 5G Telematics Modem** | Quectel RM500Q-GL 5G NR • Dual SIM • mTLS Encryption | Transmits low-latency MQTT hazard event payloads to PostGIS backend. |
| **`rear-safety`** | **Rear & Side Proximity Radar/LiDAR** | 77GHz Millimeter Wave Radar • 150m Range • IP69K Waterproof | Monitors blind spots, rear traffic density, and proximity hazards. |

---

## 5. Core Software Modules & Implemented Innovations

### 5.1 Google Maps Road Snapping & 60 FPS LERP Engine
- **Module**: `apps/web/lib/road_snapper.ts`, `apps/web/lib/routes.ts`, `apps/web/components/map/ops_map.tsx`
- **Problem Fixed**: Raw GPS coordinates cause buses to jump across buildings or off-road terrain.
- **Solution**:
  - Pre-snapped route centerlines (`ROUTES`) defining exact road geometry coordinates across urban routes.
  - Runtime coordinate snapping using segment projection math: calculates perpendicular projections onto polyline line segments to guarantee 100% road alignment.
  - Linear Interpolation (LERP) motion loop running at 60 FPS inside `requestAnimationFrame`, smoothly animating bus marker position and orientation heading angle between telemetry update ticks.

### 5.2 3D Bharat Bus Digital Twin Viewport Engine
- **Module**: `apps/web/components/3d/bus_model_viewer.tsx`
- **Problem Fixed**: WebGL canvases initialized inside hidden modal containers or tab panels often collapse or render black screen due to zero initial width/height.
- **Solution**:
  - **Dynamic ResizeObserver**: Attached `ResizeObserver` to the canvas wrapper div to recalculate camera aspect ratio (`camera.aspect`) and renderer dimension bounds (`renderer.setSize`) dynamically upon mount or modal resize.
  - **Procedural 3D Fallback Mesh**: If the GLTF 3D model (`/bharat-bus-av.glb`) fails to load or times out, the viewer dynamically constructs a full 3D procedural bus model (chassis, windshield, wheels, sensor arrays) using Three.js primitive geometries.
  - **Exploded View Assembly**: Supports parametric explosion factors ($0.0 \rightarrow 1.0$) for hardware spec inspection (`/architecture` page).

### 5.3 Google Street View Modal Overlay
- **Module**: `apps/web/components/dashboard/bus_street_view.tsx`, `apps/web/components/dashboard/bus_telemetry_modal.tsx`
- **Features**:
  - Integrated `google.maps.StreetViewPanorama` directly inside the compact telemetry modal popup (`max-w-md`).
  - Automatically targets vehicle coordinates (`lat`, `lng`) and orientation (`heading`).
  - Includes a 100-meter radius Street View service availability check and falls back gracefully to a static street view snapshot API preview when interactive panorama data is unavailable.

### 5.4 Resilient Non-Blocking Auto-Refresh Architecture
- **Module**: `apps/web/lib/api.ts`, `apps/web/app/dashboard/page.tsx`
- **Problem Fixed**: Auto-refresh loops calling API endpoints previously wiped `buses` and `events` arrays when network latency or HTTP error codes occurred, clearing map markers.
- **Solution**:
  - Updated `getJson` helper to return `null` on failed HTTP requests instead of fallback empty arrays (`[]`).
  - Updated `DashboardPage` polling handlers (`loadBuses`, `loadEvents`, `loadHealth`) with `null` guards (`if (!alive || !next) return;`), ensuring existing UI state persists smoothly across transient network glitches.

### 5.5 In-App Evidence Snapshot Modal
- **Module**: `apps/web/components/ops/evidence_modal.tsx`, `apps/web/components/ops/event_card.tsx`
- **Problem Fixed**: Clicking "Open evidence" previously launched an external browser tab, taking operators away from the control dashboard.
- **Solution**:
  - Implemented `<EvidenceModal />` overlay popup (`max-w-md`) displaying the optical camera snapshot, AI confidence score, severity badge, reporting bus ID, timestamp, and GPS coordinates directly over the dashboard map.

### 5.6 Production Uptime Monitoring & CI/CD Pipeline
- **Module**: `apps/api/app/api/endpoints/health.py`, `.github/workflows/ci.yml`, `.github/workflows/cd.yml`
- **Features**:
  - Enhanced `/health` endpoint to support both `GET` and `HEAD` HTTP request methods, resolving 405 Method Not Allowed errors on third-party monitoring services (e.g., UptimeRobot).
  - Configured git hooks:
    - `.githooks/pre-commit`: Executes `pnpm --filter web type-check` before commits.
    - `.githooks/pre-push`: Executes `python -m pytest` before remote pushes.

---

## 6. Key Data Schemas & Models

### 6.1 Bus Vehicle Model (`Bus`)
```typescript
export interface Bus {
  id: string;
  bus_id?: string;
  bus_number: string;
  route_name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  last_seen: string;
}
```

### 6.2 Road Anomaly Detection Event Model (`DetectionEvent`)
```typescript
export interface DetectionEvent {
  id: string;
  bus_id: string;
  event_type: 'POTHOLE' | 'ROAD_DAMAGE' | 'WATERLOGGING' | 'TRAFFIC' | 'TRAFFIC_SIGN' | 'ZEBRA_CROSSING' | 'PEDESTRIAN_RISK' | 'INCIDENT';
  confidence: number; // e.g. 0.948 (94.8%)
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latitude: number;
  longitude: number;
  timestamp: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'IN_PROGRESS' | 'RESOLVED';
  evidence_url?: string | null;
  metadata?: Record<string, any> | null;
}
```

---

## 7. Verification, Quality Control & Test Results

The platform enforces zero-tolerance quality gates across both frontend and backend packages:

```
[ Developer Workflow ]
        │
        ├──> git commit ──> [ Pre-Commit Hook ] ──> pnpm --filter web type-check (0 Errors)
        │
        └──> git push   ──> [ Pre-Push Hook ]   ──> python -m pytest (9/9 Passed) ──> GitHub main
```

### Verification Matrix
- **TypeScript Type Check**: `pnpm --filter web type-check` (Passed with 0 errors).
- **Backend Pytest Suite**: `python -m pytest` (9 passed in 2.1s).
- **Git Commit Verification**: Commit [`049ab47`](https://github.com/rithvin-us/Mobile-Urban-Intelligence/commit/049ab47) verified clean on branch `main`.

---

## 8. Summary of Accomplishments

1. **Integrated 3D Hardware Digital Twin & Exploded View Architecture**.
2. **Built 60 FPS Real-Time LERP Engine Snapped 100% to Google Maps Road Polylines**.
3. **Designed Compact Modal Popups (`max-w-md`) for 3D Bus, Live AI Dashcam, and Google Street View**.
4. **Eliminated Screen Blanking with Resilient Non-Blocking Auto-Refresh Logic**.
5. **Integrated In-App Evidence Snapshot Modal Overlay**.
6. **Configured HEAD/GET `/health` Endpoint for UptimeRobot Uptime Monitoring**.
7. **Automated End-to-End Type Safety & Pytest Verification via CI/CD Git Hooks**.
