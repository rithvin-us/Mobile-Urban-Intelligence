# MATLAB Simulations — Mobile Urban Intelligence

Physics-based validation of the road-hazard sensing claims the platform makes. The
dashboard and the Jetson edge pipeline detect hazards from camera frames; these
simulations answer the question a judge or a municipal engineer will ask next:
*how do you know the detector is right, and how rough is the road in engineering
units a highways department already uses?*

## Toolbox constraint

The MATLAB installation on this machine is **base MATLAB R2026b + Simulink only**:

```
MATLAB  | 26.2
Simulink| 26.2
```

No Signal Processing, Statistics, Control System, or Computer Vision toolbox is
licensed. Every script here is therefore written against **base MATLAB only**.
Specifically, the following are avoided and hand-implemented instead:

| Not available | Replaced by |
| :--- | :--- |
| `butter`, `designfilt`, `filtfilt` | Explicit state-space quarter-car model, discretised with `expm` |
| `findpeaks` | `localPeaks` helper with an explicit refractory distance |
| `pwelch` | ISO 8608 displacement PSD synthesised directly in the frequency domain via `fft` |
| `normpdf`, `prctile` | Closed-form expressions over `mean`/`std` |

## Simulation plan

### 1. `pothole_imu_sim.m` — implemented

The flagship script. End-to-end chain:

1. **Road profile synthesis (ISO 8608).** Generates a random road elevation
   profile for a chosen roughness class (A–E) by shaping white noise with the
   standard displacement PSD `Gd(n) = Gd(n0) * (n/n0)^-w`, with `n0 = 0.1`
   cycles/m and `w = 2`.
2. **Ground-truth defect injection.** Potholes, transverse cracks and speed
   breakers are superimposed at known chainages with known depth and length, so
   detector output can be scored against truth rather than against opinion.
3. **Bus quarter-car ride dynamics.** A 2-DOF sprung/unsprung model of one
   corner of an 18-tonne city bus converts the road profile into the vertical
   acceleration an onboard IMU would actually record at the specified speed.
4. **IRI in m/km (ASTM E1926).** The same profile is run through the standard
   *golden car* at the reference 80 km/h to produce the International Roughness
   Index, letting the platform report road condition in the unit highway
   authorities already budget against.
5. **Hazard detection.** Short-window RMS energy of the band-limited axle
   acceleration, thresholded in robust (median / MAD) units, with a refractory
   distance so one pothole yields one event. Severity is graded from peak
   magnitude onto the platform's `LOW | MEDIUM | HIGH | CRITICAL` ladder.
6. **Scoring.** Detections are matched to ground truth within a position
   tolerance to give TP / FP / FN, precision, recall and F1, plus a threshold
   sweep that traces the precision-recall trade-off.
7. **Geotagging and API bridge.** Chainage is mapped onto a real Coimbatore
   route polyline (the corridor the seeded fleet runs) and written out as
   `detections.json`, shaped exactly like the FastAPI `EventCreate` schema so the
   simulated events can be posted straight into the live dashboard.

Outputs land in `matlab sims/output/`:

- `detections.json` — events in `POST /api/events` payload form
- `summary.json` — IRI, class, detector metrics
- `fig_profile_accel.png`, `fig_detection.png`, `fig_pr_curve.png`

### 2. `postDetectionsToApi.m` — implemented

Posts `output/detections.json` into the running backend with `webwrite`, so a
MATLAB-simulated corridor survey appears on the operator dashboard alongside
edge-AI and simulator traffic. Guarded: it refuses to run unless `/health`
answers first.

### 3. Candidates not yet built

Listed so the plan is explicit about what is and is not implemented:

- `gps_fusion_sim.m` — complementary / Kalman fusion of 20 Hz RTK GNSS with
  wheel odometry, quantifying the drift the dashboard's `road_snapper.ts`
  currently corrects geometrically. Base MATLAB can do this; the Kalman update
  would be hand-written.
- `fleet_coverage_sim.m` — Monte Carlo study of what fraction of the Coimbatore
  arterial network gets surveyed per day as fleet size grows from 10 to 200
  buses, supporting the "transit fleet as a sensor grid" argument with a curve.
- `edge_latency_model.m` — throughput and queueing model of the Jetson Orin Nano
  pipeline (capture → TensorRT inference → tracking → uplink), predicting the
  sustainable FPS and the end-to-end event latency budget.

## Running

From the repository root:

```sh
matlab -batch "cd('matlab sims'); pothole_imu_sim"
```

Or inside MATLAB:

```matlab
cd('matlab sims')
pothole_imu_sim
```

To push the results into a running backend (start the API first):

```matlab
postDetectionsToApi('http://localhost:8000', 'bus-001')
```

> Note: this folder name contains a space. Always quote it in `cd`, `addpath`
> and shell commands.
