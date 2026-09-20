# Urban Intelligence — audit, rebuild and roadmap

**Date:** 20 September 2026
**Branch:** `main`, pulled to `c520b92` before any work started
**Scope:** operator console redesign, offline demo mode, ML pipeline wiring, pipeline and
deployment verification, map rendering performance.

Everything marked *verified* below was reproduced by running it, and the command or
measurement is quoted. Everything marked *needs your action* is outside what I can change
from the repository.

---

## 1. Verdict first

The idea is sound and the model is real. The platform was **not** working end to end, for
five separate reasons that each looked like "the demo is a bit broken" and were in fact
independent faults. All five are fixed and re-verified. Two remaining problems are in your
hosting accounts, not in the code, and you have to fix them before recording.

| Layer | Before | After |
|---|---|---|
| Console layout | Two toolbars rendered at the same coordinates; panels fixed-width columns | One flex tree, 8 floating glass panels, **0 overlapping pairs measured in the DOM** |
| Demo without a backend | Impossible — blank console | Scripted fleet, no API, no database, deterministic |
| Edge ML → API | Event rejected on Postgres, 190 KB per row | Frame stored as a file, 47-character path |
| Detector on real weights | Never exercised by any test | 4 of 4 classes verified against the trained model |
| Road scan latency | 19.7 s per scan | 2.05 s |
| Map markers | One DOM node per detection, icon rebuilt 60×/s | GPU point layer, icon rebuilt only on change |

---

## 2. What was actually broken

### 2.1 The dashboard could not reach its own API — *needs your action*

Your screenshot shows `0/0 buses`, `API Offline`, `Database Offline`, `connecting`. That is
the console reporting the truth. The API is behind a Cloudflare managed challenge:

```
$ curl -s -w "HTTP:%{http_code}" https://urban-intel-api.onrender.com/health/system
<!DOCTYPE html><html><head><title>Just a moment...</title>  ...cf_chl_opt...
HTTP:429
```

Same result with a browser user agent. A managed challenge cannot be solved by a
`fetch()` from your dashboard — an XHR has no way to run the challenge page — so **every
poll fails and the console stays empty**. The Vercel dashboard itself is fine
(`HTTP 200`).

This is a Render-side protection, usually triggered on free instances by request volume.
Your dashboard polls `/api/buses` every second, `/api/events` every two, `/health/system`
every five: roughly **5,000 requests per hour per open tab**, which is what trips it.

**Do this:** in the Render dashboard, check the service's security / bot-protection
setting and turn the managed challenge off for this service, or move the API to a paid
instance. Then lengthen the poll intervals — 1 s for positions is far more than an
operator needs. Until that is done, use the scripted demo mode below; it needs no backend
at all.

### 2.2 Every evidence photo was a dead link — *fixed*

Seed data, the demo feed and the simulator all pointed at a Cloud Storage bucket that no
longer exists:

```
pothole_sample.jpg -> 404
traffic_sample.jpg -> 404
```

The repo already contains the real photographs in `apps/web/public/evidence/`. All three
producers now point there.

### 2.3 The ML pipeline would have failed on production Postgres — *fixed*

The edge unit burns the model's boxes into the frame and sends it as a `data:` URL. I ran
the real runner against a local API:

```
evidence_url len = 187831
prefix = data:image/jpeg;base64,/9j/4AAQSkZJRgABA
```

`Event.evidence_url` was `Column(String(500))`. SQLite ignores VARCHAR length, so this
worked locally and **would have raised `StringDataRightTruncation` on the Render Postgres
instance** — the entire edge AI path, the headline feature, dead in production and working
on your laptop.

Second problem: the dashboard requests 250 events every two seconds. One base64 event
already pushed that payload to 232 KB. A hundred would have made it ~19 MB per poll.

**Fix:** `apps/api/app/services/evidence_store.py` decodes the data URL once, writes the
JPEG to disk, and stores a short path. The column is now `Text`, and `ensure_schema()`
widens it in place on existing Postgres deployments. Verified end to end:

```
POST /api/buses/telemetry  -> 200
POST /api/events           -> 201
evidence_url               -> /static/evidence/edge-bus-005-1789917846687.jpg  (47 chars)
GET  that path             -> HTTP 200, 141984 bytes, image/jpeg
```

### 2.4 Demo mode silently replaced your 50 km network with an old 6-route city map — *fixed*

With `DEMO_MODE=1`, `demo_feed.py` overwrote all 24 seeded buses with its own hard-coded
route names:

```
24 buses; routes: ['14C', '21A', '3B', '45', '70', 'S7']
```

`3B` and `S7` do not exist in `apps/web/lib/routes.ts`, and the six regional corridors
(`101`–`606`) had vanished. A bus on an unknown route gets no polyline and no road
snapping, so it drifts across fields. `demo_feed.ROUTES` is now generated from
`routes.ts`, and its fault hotspots sit on real waypoints of those corridors:

```
24 buses; routes: ['101', '14C', '202', '21A', '303', '404', '45', '505', '606', '70']
```

### 2.5 The detector could not be created, and a scan took twenty seconds — *fixed*

```python
ModelRegistry.create('multilabel_yolo')
ValueError: Unknown detector model type 'multilabel_yolo'. Available: ['mock']
```

The decorator only registers on import, and nothing imported the module. The registry now
imports its built-in detectors itself.

Separately, `bus_edge_ai.py` handed a `.webm` path straight to Ultralytics, which decodes
the **entire clip** into RAM and returns every frame — then the code used frame 0 and threw
the rest away:

```
webm -> 1 dets in 19.71 s
```

A single frame is now grabbed with OpenCV first. Same clip, same weights: **2.05 s**, most
of which is one-time model warm-up.

### 2.6 A rejected Maps key looked identical to a slow network — *fixed*

`globals.css` contained a blanket rule hiding `.gm-err-container`, `.gm-err-message` and
the auth modal. That rule hides Google's *"this page can't load Google Maps correctly"*
dialog, which is exactly how you learn that billing is off, the API is not enabled, or the
referrer is not allowed. With it hidden, all three failures render as a plain grey box.

Only the zoom-level toast is hidden now. `gm_authFailure` is captured in `maps_loader.ts`
and the map reports the cause in words.

### 2.7 The map bound itself to a discarded container — *fixed*

Under React StrictMode the init effect guarded on *"does a map already exist"*, so on the
second pass it kept a map attached to a detached DOM node and the console rendered with
nothing underneath. The guard is on the container node identity now, and it rebuilds
cleanly when the node changes.

### 2.8 Other things found

- `google.maps.DirectionsService` fires **once per corridor, 10 per page load** — billable
  and deprecated as of 25 Feb 2026. The result is cached per route for the page's life, but
  it should be baked into `routes.ts` at build time instead (see §6).
- `google.maps.Marker` is deprecated in favour of `AdvancedMarkerElement`.
- `useFleetWebSocket` in `lib/websocket.ts` is never used, and nothing on the server
  broadcasts to `ws_manager` — the WebSocket endpoint accepts connections and sends
  nothing. The console is pure polling. Not a bug, but the architecture doc claims
  otherwise.
- `stream_worker.py` is never started by anything.
- `components/map/deckgl_layer.tsx` was a badge that printed *"WebGL Spatial Overlay: N
  Points"*. There was no WebGL and no overlay. There is now (§4) — the badge is obsolete.
- Your Maps API key is compiled into the browser bundle by design (`NEXT_PUBLIC_*`) and is
  readable by anyone who opens the page. Restrict it in Google Cloud Console to your Vercel
  domain and cap its quota.

---

## 3. The console redesign

### What you asked for, and what it is now

**Floating, not fixed.** The map is full-bleed. Every surface — status bar, Controls,
City intelligence, filters, map controls, alerts, detail cards, legend — is a floating
glass card over it with a 12 px gutter.

**Nothing can overlap anything.** This was a real structural bug, not a z-index tuning
problem: `QuickFilterBar` and `MapToolbar` were both absolutely positioned at
`left-3 top-3`, so the basemap switcher and the four map toggles were rendered *underneath*
the filter chips and were unclickable. The critical alert, at `z-30`, then covered
whatever survived.

Absolute siblings are gone. Every overlay now lives in one flex tree, so two panels cannot
be told to occupy the same corner. Measured in the running page:

```
glass panels: 8      overlapping pairs: 0
```

The top lane is reserved for the alert. Basemap and overlay switches moved to a bottom-left
bar; zoom, fit and fullscreen stay on a right-hand rail.

**Everything is toggleable.** A **View** menu in the status bar switches each piece of
chrome independently, with *Map only* and *Show all*. Choices persist per browser.
Keyboard: `[` Controls · `]` Intelligence · `V` hide everything · `T` theme · `D` demo ·
`G` GPU markers · `F` fit fleet · `L` basemap · `3` tilt · `R` radar · `?` shortcuts.

### Typography

Two families replace the previous system stack:

- **Archivo** for the interface — a grotesque drawn for signage and dense tabular settings.
- **IBM Plex Mono** for every number, so telemetry columns do not jitter as values change.

A 1.2 type scale off a 13 px base (`micro` 10 / `mini` 11 / `sm` 12 / `base` 13 / `md` 15 /
`lg` 18 / `xl` 22) replaces the ad-hoc `text-[10px]` … `text-[16px]` values that were
scattered through the components.

### Colour

Grounded in road survey rather than the default dashboard blue: asphalt-graphite canvas
(`#0E1216`), road-marking yellow as the single accent (`#F0B429`), and a severity ramp that
is the only other saturated colour on screen. Accent means *live or selected* and nothing
else. The daylight theme is a concrete grey (`#E9EAE5`) with a darker ochre accent so
contrast holds.

The alert banner no longer uses `animate-pulse`. A banner that pulses forever stops meaning
"new" and starts meaning "ignore me"; it now animates once on arrival and holds still.

The evidence and telemetry modals were hard-coded to `slate-*` and broke in the light
theme. They use the theme tokens now.

---

## 4. The map is laggy — here is why, and what changed

Your instinct was right, but the fix is not a browser setting. Four separate CPU costs:

**1. The icon was rebuilt 60 times a second, per bus.** The animation loop called
`marker.setIcon({ url, size: new Size(...), scaledSize: new Size(...), anchor: new Point(...) })`
every frame for every vehicle — three object allocations and a full icon swap per bus per
frame, whether or not the sprite had changed. It now writes an icon only when the heading
frame or the fleet state actually changes, and reuses shared `Size`/`Point` objects.

**2. The animation loop restarted every second.** The `requestAnimationFrame` effect listed
`buses` as a dependency. Every telemetry poll produced a new array, which cancelled and
restarted the loop — visible as a stutter exactly once per second. It reads telemetry
through a ref now and starts once.

**3. Road snapping rescanned the whole corridor every frame.** `snapCoordinateToPolyline`
walked all segments of a route for every bus, every frame. A bus moves a few metres between
frames, so the search is now windowed around the previous segment, with a full-scan
fallback when a fix jumps.

**4. Every detection was a DOM node.** `google.maps.Marker` with `optimized: false` creates
one element per marker; the browser lays out, paints and composites each of them on the
**CPU** every time the map moves. That is fine for a handful and visibly janky by a few
hundred — which is the normal size of one day's road audit.

### The GPU answer

Detections now render through **deck.gl's `GoogleMapsOverlay`**, which shares the map's own
WebGL context and uploads the points once as vertex data. Panning costs the GPU a draw call
instead of costing the CPU a layout pass. It is `@deck.gl/core`, `@deck.gl/layers` and
`@deck.gl/google-maps`, dynamically imported so the WebGL bundle never lands on a session
that does not use it — the dashboard chunk is **30.5 kB**, unchanged in practice.

It is a switch: **Controls → GPU markers**, or `G`. If deck.gl cannot start (no WebGL2, a
blocked chunk) the DOM markers come back automatically rather than the map showing no
detections at all.

The 24 vehicles stay as DOM markers on purpose — they need per-heading rotated sprites,
and two dozen elements cost nothing. It is the point cloud that scales, and that is what
moved to the GPU.

### What you should still do

- **Check hardware acceleration is actually on** in the browser you record with:
  `chrome://gpu` should say *Hardware accelerated* for Canvas, WebGL and WebGL2. If it says
  *Software only*, deck.gl runs on SwiftShader and will be slower than DOM markers. This is
  worth checking before you blame the code.
- **Move to a vector basemap.** `mapStyle`/`styles` forces Google's raster renderer. A
  `mapId` with vector rendering moves the *basemap itself* onto the GPU and enables real
  tilt and rotation. It is the single largest remaining win, and it is a Cloud Console
  change plus swapping `styles` for `mapId`.
- **Migrate off `google.maps.Marker`** to `AdvancedMarkerElement` — deprecated, and the
  advanced markers are considerably cheaper.
- **Slow the polling down.** 1 s position polling is the biggest source of main-thread work
  and the reason Cloudflare started challenging the API. 3–5 s with the existing dead
  reckoning between fixes looks identical on screen.

---

## 5. Recording a demo with no live data

This was the other thing standing between you and a video, and it is now a first-class
mode rather than a workaround.

```
http://localhost:3000/dashboard?demo=1      # or press D, or click the Live/Demo pill
```

`apps/web/lib/demo_engine.ts` runs the entire console with **no API, no database and no
network**:

- 24 buses driving the real corridor geometry from `routes.ts`, at steady speed, with
  halts.
- 18 fixed road faults on those corridors. A bus passing one reports it — which is what
  produces repeat sightings of the same defect from different vehicles, the signal an
  officer actually acts on.
- 46 detections of scripted history, so the console opens with a populated list, resolved
  cases and a real average response time rather than zeros.
- Detection metadata carries the true model name, class label and an inference time, so the
  evidence popup shows what the edge unit would show.
- Seeded PRNG — **every take of your video is identical**.
- Acknowledge / dispatch / resolve all work locally and update the panels.
- `engine.injectCritical()` drops a fresh critical pothole on screen on cue, if you want to
  narrate the alert arriving.

It also self-arms: if the live API fails three polls in a row, the console switches to the
scripted fleet and the status bar says `scripted fleet · API unreachable` rather than
sitting blank. Honest, and it cannot leave you with an empty screen mid-recording.

**Suggested three-minute run:** open on the fitted fleet → `V` for map only, let the buses
drive → restore chrome → a critical alert arrives, *Show on map* → open the detection,
evidence photo with the model's box and confidence → *Dispatch crew* → filter to Critical
only → CSV export → `T` for the daylight theme → `G` to show GPU markers → 3D tilt on a
satellite basemap.

---

## 6. What to build next, ranked by demo value per hour

**High value, small effort**

1. **Repeat-sighting confidence.** `buildClusters` already groups sightings. Surface it:
   *"reported by 6 buses over 3 days"* is the single most convincing number in the whole
   product, because it is the thing a manual inspection cannot produce.
2. **Severity-weighted repair queue.** Rank open defects by severity × sightings × road
   class and show *"today's work order"*. This is the artefact a municipal engineer would
   actually print.
3. **Bake the snapped route geometry into `routes.ts`.** One offline script, run once,
   kills 10 Directions API calls per page load and removes a deprecated dependency.
4. **A time scrubber.** Replay the last 24 hours of detections. Cheap with the data you
   already have, and it makes the "continuous audit" claim visible instead of stated.

**High value, medium effort**

5. **Defect growth over time.** The same pothole, sighted on day 1 and day 30, with the
   confidence and bounding-box area trend. This is the actual predictive-maintenance claim
   and nothing else in the product demonstrates it.
6. **Cost-avoided counter.** Detections × an average pothole-related claim value. Crude,
   but it is the number that gets a budget approved.
7. **Ward / zone rollup.** Defects per municipal ward, with a league table. Municipalities
   are organised by ward; the product currently is not.
8. **Officer assignment and SLA.** Assign a defect to a crew, set a due date, show
   breaches. `acknowledged_at` and `resolved_at` already exist and are unused beyond one
   average.

**Worth doing for credibility, not for the demo**

9. **Make the WebSocket real.** Have `create_event` broadcast through `ws_manager` and let
   the console subscribe. Removes the polling that triggered Cloudflare and makes the
   architecture diagram true.
10. **Model card.** Classes, training set, mAP, confusion matrix, and the confidence
    threshold you ship at. Any serious evaluator will ask, and "150 epochs" is not an answer.
11. **A real confidence threshold study.** You currently ship `0.45`–`0.50`. The
    waterlogging sample scores `0.40` on your own weights, i.e. **your current threshold
    misses it**. That is worth knowing before someone else finds it.

---

## 7. The unique value proposition

Strip away the dashboard and the 3D bus, and one sentence remains:

> **Every municipal bus already drives every arterial road several times a day. This turns
> that existing, fully-funded movement into a continuous road-condition survey, at no
> additional vehicle cost and with no additional kilometres driven.**

The defensible parts:

- **Zero marginal survey cost.** A dedicated survey vehicle costs money per kilometre. The
  bus drives that kilometre anyway. Your marginal cost is a camera and a compute module,
  amortised over a route that repeats daily for years.
- **Repetition is the moat, not detection.** Pothole detection is a solved, commoditised CV
  problem — you can buy it. What you cannot buy is *the same stretch of road, imaged from
  the same angle, six times a day, for a year*. That turns a detection into a **trend**, and
  a trend is what makes maintenance predictive instead of reactive. Nobody with a drone or
  a survey van gets that sampling rate.
- **Bandwidth honesty.** Inference is on the vehicle; only metadata and one compressed
  frame leave it. That is the difference between a system a transport corporation can run
  on existing LTE and one that needs a fibre budget.
- **It lands in an existing workflow.** A defect with GPS, a photograph, a confidence score
  and a severity is a work order. It does not ask the municipality to change how it
  operates.

What is *not* your UVP, and should not be pitched as one: the YOLOv8 model, the 3D bus
twin, the map. Those are table stakes or decoration. Lead with repetition and marginal
cost.

---

## 8. Does it solve the problem in the brief?

Against §2.1 of `PROJECT_SUMMARY.md`:

| Stated problem | Status |
|---|---|
| Slow, reactive hazard detection | **Solved in architecture, demonstrated in prototype.** Detection to operator screen is seconds. What is missing is proof over time — see the defect-growth feature. |
| Underutilised transit capital | **Solved conceptually.** The whole design rests on it. Unproven on real hardware — no Jetson has run this. |
| Bandwidth / cloud bottleneck | **Solved in design, now true in code.** Inference is on the edge unit; only metadata plus one compressed frame is sent. Until today the frame was a 190 KB base64 string inside a JSON row, so the claim was not yet true. It is now. |

Against §2.2, the engineering challenges:

| Stated problem | Status |
|---|---|
| GPS drift / off-road markers | **Solved.** Segment-projection snapping with a 500 m sanity guard, now windowed so it is cheap. |
| UI state loss on auto-refresh | **Solved.** Failed polls preserve state, and now fall through to the scripted fleet rather than blanking. |
| Modal overcrowding | **Solved, and it was the visible fault in your screenshot.** Two toolbars shared one coordinate. Structurally impossible now. |

**Honest gaps.** No Jetson deployment — the "edge" is a Python process on a laptop. No
measured model performance on Coimbatore roads; the weights are from a public dataset. No
municipal user has touched it. PostGIS is provisioned but no spatial query uses it; the
clustering is in TypeScript in the browser. None of these stop a demo, and all of them will
be asked about.

---

## 9. Verification log

Everything below was run after the changes.

```
apps/api      pytest                     9 passed
apps/api      ruff check --ignore E501   All checks passed
apps/web      tsc --noEmit               clean
apps/web      next build                 compiled, /dashboard 30.5 kB / 118 kB first load
edge          test_detector.py           registration, weights, 4/4 classes, frame grab, annotation

Live edge -> API, against a local API with DEMO_MODE=1:
  POST /api/buses/telemetry   200
  POST /api/events            201
  GET  /static/evidence/...   200, 141984 bytes, image/jpeg

Real weights, real photographs:
  pothole_sample.jpg      -> POTHOLE       79.1%
  waterlogging_sample.jpg -> WATERLOGGING  40.4%
  road_damage_sample.jpg  -> ROAD_DAMAGE   82.8%
  cracks_sample.jpg       -> ROAD_DAMAGE   53.5%

Console layout, measured in the running page:
  glass panels 8, overlapping pairs 0
```

The `edge/test_detector.py` suite previously passed without ever running the model — every
assertion was satisfied by the hard-coded fallback. It now runs the real weights against
each class and skips explicitly, rather than silently passing, when Ultralytics is absent.

**Not verified visually.** The Chrome instance available in this session has a broken
compositor — `Page.captureScreenshot` times out on every page including `example.com`, and
Google Maps tiles never paint. Layout was verified by measuring element geometry in the
live DOM instead. Open the console yourself once before recording.

---

## 10. Before you record

1. Turn off Cloudflare's managed challenge on the Render service, or plan to record in
   demo mode (`?demo=1`). Demo mode is the safer choice either way.
2. Confirm the Maps key in Google Cloud Console: billing on, Maps JavaScript API enabled,
   referrer restriction includes your Vercel domain and `localhost`. If it is wrong, the
   console will now tell you so in words instead of showing grey.
3. Check `chrome://gpu` says hardware accelerated.
4. Redeploy the API so `ensure_schema()` widens `events.evidence_url` on the Postgres
   instance before any edge unit posts a frame.
