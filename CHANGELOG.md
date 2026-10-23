# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-10-24

First complete release: edge AI, backend, dashboard and validation models all
verified working end to end.

### Added

- **MATLAB and Simulink validation suite** (`matlab sims/`). `pothole_imu_sim.m`
  synthesises an ISO 8608 road profile, drives a 2-DOF bus quarter-car over it,
  grades the corridor with the ASTM E1926 golden car, detects hazards from the
  simulated IMU signal and scores them against ground truth. Two Simulink models
  accompany it: `quarter_car_model.slx` for ride dynamics and
  `edge_pipeline_latency.slx` for the glass-to-dashboard latency budget.
- **MATLAB to backend bridge** (`postDetectionsToApi.m`), which posts simulated
  detections through the same `POST /api/events` path a Jetson edge unit uses.
- **WebSocket fleet broadcaster** (`fleet_broadcast.py`). `/api/ws/fleet`
  previously accepted clients and sent them nothing; it now streams
  `FLEET_UPDATE` snapshots and `EVENT_ALERT` messages, and stays idle while no
  client is connected.
- **H.264 fallback for the video annotator.** When OpenCV has no H.264 encoder
  available, output is re-encoded with ffmpeg so annotated clips play in a
  browser.
- Repository documentation: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`,
  `CHANGELOG.md`, issue and pull request templates, and Dependabot
  configuration.

### Fixed

- **Backend could not start against PostgreSQL.** SQLAlchemy 2.1 resolves a bare
  `postgresql://` URL to the psycopg 3 driver, while the project pins
  `psycopg2-binary`. The driver is now named explicitly in the URL, so the same
  `DATABASE_URL` works under SQLAlchemy 2.0 and 2.1.
- **Defect cluster endpoint returned 404.** `/events/clusters` was registered
  after `/events/{event_id}`, so it was matched as an event id. Clusters are now
  registered first.
- **Cluster view stalled under load.** Clustering compared every event with
  every other, which at the 4000-event cap meant millions of distance
  calculations. Events are now bucketed by type and latitude band and the scan
  is bounded, taking the response from tens of seconds to 16 ms.
- **Annotated dashcam clips would not play in browsers** on platforms where
  OpenCV falls back to the `mp4v` codec.

### Changed

- `DEMO_MODE` is documented in `.env.example` and wired through
  `docker-compose.yml`, defaulting to off. With it enabled the API drives the
  fleet itself, so a deployment with no simulator or edge device attached still
  shows a live dashboard.
- Repository layout tidied: architecture and deployment documents moved under
  `docs/`, the Windows OpenH264 library moved to `edge/vendor/`, and duplicated
  media assets removed from the repository root.

[Unreleased]: https://github.com/rithvin-us/Mobile-Urban-Intelligence/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/rithvin-us/Mobile-Urban-Intelligence/releases/tag/v1.0.0
