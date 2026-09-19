# Mobile Urban Intelligence (Edge AI Fleet) - Project Summary

## Executive Overview
**Mobile Urban Intelligence** is an advanced Edge AI fleet telematics and spatial intelligence platform designed for urban public transit systems (Bharat Bus AV Fleet). The platform transforms ordinary transit buses into autonomous road quality auditors, capturing real-time road defects (potholes, surface cracks, waterlogging, traffic hazards) via onboard NVIDIA Jetson edge computers and streaming low-latency telematics to a central PostGIS control dashboard.

---

## Problem Statement

### 1. The Challenge in Municipal Road Maintenance
- **Reactive Inspection Cycles**: Traditional urban road hazard monitoring relies on slow, manual citizen reporting or periodic physical inspections. As a result, critical defects like severe potholes and waterlogging remain unaddressed for weeks, causing vehicle damage and traffic hazards.
- **Underutilized Fleet Potential**: Municipal buses travel millions of kilometers every day across all primary and secondary urban corridors, but traditionally act only as passenger transport without capturing environmental intelligence.
- **Data Latency & Fragmentation**: Existing fleet management systems provide static GPS pinging without real-time AI anomaly detection, interactive 3D hardware diagnostics, or spatial verification.

### 2. Front-End & Telemetry UX Technical Challenges
- **Off-Road Vehicle Drift**: Raw GPS coordinates suffer from atmospheric drift, placing buses on top of buildings or off-road terrain.
- **UI State Loss & Flickering**: Naive auto-refresh polling mechanisms wipe map markers, active popups, and alert cards when transient API delays or 404/500 errors occur.
- **Cluttered & Intrusive Modals**: Full-page modal overlays disrupt the operator's situational awareness on the main map view.

---

## System Architecture & Technical Stack

```
+-------------------------------------------------------------------------+
|                              FRONTEND WEB                               |
|   Next.js 15 • React 19 • TypeScript • Tailwind CSS • Three.js / WebGL  |
|   Google Maps API (Road Snapping & Street View) • Canvas AI Dashcam     |
+-------------------------------------------------------------------------+
                                    ▲
                                    │ REST / WebSockets / Telemetry
                                    ▼
+-------------------------------------------------------------------------+
|                           BACKEND & SIMULATOR                           |
|   FastAPI (Python) • PostGIS Spatio-Temporal Ingestion • Pytest Suite   |
|   Async Telemetry Generator • Health & Uptime Monitoring (/health)      |
+-------------------------------------------------------------------------+
```

---

## Core Capabilities & Implemented Solutions

### 1. 60 FPS Road-Snapped Vehicle Motion Engine
- Implemented `RoadSnapper` polyline interpolation using Google Maps Road APIs and high-density route centerlines (`apps/web/lib/road_snapper.ts`, `lib/routes.ts`).
- Prevents off-road bus drift, keeping 100% of vehicle markers aligned to real asphalt roads at 60 FPS with smooth LERP dead-reckoning.

### 2. Compact 3D Digital Twin & Telemetry Overlays
- **3D Bus Model Viewer**: Three.js WebGL canvas (`apps/web/components/3d/bus_model_viewer.tsx`) with auto-resizing `ResizeObserver`, sensor hotspot pins (Front Optical Camera, NVIDIA Jetson Orin Edge Unit, u-blox GNSS Antenna, 5G Telematics Modem, LiDAR), and procedural 3D fallback geometry.
- **Compact Overlay Popups**: Redesigned bus detail modals (`apps/web/components/dashboard/bus_telemetry_modal.tsx`) into compact `max-w-md` cards with instant view switching:
  - **3D Bus**: Interactive 3D digital twin.
  - **Live Feed**: Simulated 60 FPS optical AI dashcam with real-time detection bounding boxes.
  - **Street View**: Google Maps `StreetViewPanorama` centered on vehicle coordinates and heading.

### 3. Non-Blocking Resilient Auto-Refresh
- Refactored HTTP fetch handlers (`apps/web/lib/api.ts` & `app/dashboard/page.tsx`) to return `null` on network errors rather than fallback empty arrays (`[]`).
- Preserves map state, active selections, and alert lists seamlessly without blanking the screen or stuttering during background auto-refresh ticks.

### 4. Inline Evidence Modal Popup
- Created `<EvidenceModal />` (`apps/web/components/ops/evidence_modal.tsx`) to display AI detection snapshots, confidence scores, severity badges, and GPS coordinates directly in an overlay popup instead of opening new browser tabs.

### 5. Production Health & CI/CD Pipeline
- Extended `/health` endpoint (`apps/api/app/api/endpoints/health.py`) to support GET and HEAD methods for UptimeRobot monitoring.
- Integrated automated Git hooks (`.githooks/pre-commit` for TypeScript type-check and `.githooks/pre-push` for Pytest suite).

---

## Verification & System Quality

| Verification Metric | Result | Command |
| :--- | :--- | :--- |
| **Frontend TypeScript Type Check** | 0 Errors | `pnpm --filter web type-check` |
| **Backend Pytest Test Suite** | 9/9 Passed (100%) | `python -m pytest` |
| **Git Pre-commit Hook** | Clean | Automated on `git commit` |
| **Git Pre-push Hook** | Clean | Automated on `git push` |

---

## Repository & Remote Tracking
- **Repository**: `https://github.com/rithvin-us/Mobile-Urban-Intelligence.git`
- **Main Branch**: `main`
- **Latest Commit**: `b3f7e13` (`feat(ops): open evidence in sleek modal popup overlay instead of new page tab`)
