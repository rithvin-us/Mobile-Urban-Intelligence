# Urban Intelligence Dashboard Design Brief

## Problem Context

This dashboard is built around a problem statement focused on transforming **public transport buses into mobile urban sensing units**.

The actual system is:

**Bus Camera(s) → Edge AI on the Bus → Detection → GPS + Timestamp + Confidence → Central Server → GIS / Urban Intelligence Dashboard → Transport Authorities**

The onboard AI is intended to detect and analyse:

- Potholes
- Road damage
- Traffic congestion
- Waterlogging
- Missing or damaged road infrastructure
- Missing or damaged traffic signs
- Missing zebra crossings
- Pedestrian safety risks
- Traffic incidents
- Vehicle tracking / ANPR-related incident evidence

The centralized platform aggregates observations from the bus fleet and presents them through maps, alerts, analytics, heatmaps, route insights and infrastructure intelligence.

---

## Critical Clarification: Bus-Centric System

The actual product is specifically for **public transport buses**.

The dashboard must represent:

- Public transport buses
- Bus routes
- Bus locations
- Bus telemetry
- Road-condition observations collected by buses
- Traffic observations collected by buses
- Infrastructure observations collected by buses
- Safety incidents observed by buses

### Example Bus

```text
BUS-021
Route: 21A
Speed: 42 km/h
Status: Active
Last telemetry: 8 sec ago
```

Each bus can provide:

- Bus ID / registration
- Route
- Current GPS location
- Speed
- Heading
- Status
- Last telemetry timestamp
- Detected events

---

# Reference Image Guidance

The uploaded reference images are **DESIGN INSPIRATION ONLY**.

Some of the reference images contain:

- Aircraft
- Flights
- Flight tracking
- Aircraft routes
- Airports
- Aviation dashboards
- 3D globes
- Aviation-specific controls

These elements are **NOT part of the actual implementation**.

## DO NOT IMPLEMENT

- Aircraft tracking
- Flight tracking
- Airport monitoring
- Aviation data
- Aircraft models
- Flight routes
- Earthquake monitoring
- Aviation-specific statistics
- Aviation-specific terminology

Instead, use the reference images only to understand the following design principles:

- Map-first interface
- Large central map canvas
- Layer controls
- Compact floating panels
- Collapsible sidebars
- Dense operational information
- Clean command-center layout
- Professional GIS experience
- Functional information overlays
- Realistic enterprise software feel

The visual language should be adapted completely to the **public transport bus + urban intelligence** use case.

---

# Design Direction

Create a **professional municipal transportation operations platform**.

Target feeling:

> Real urban traffic and infrastructure command center

Avoid the appearance of:

- A futuristic sci-fi interface
- A generic admin dashboard
- An AI-generated concept UI
- A colorful analytics template
- A flight tracker

The interface should feel practical, information-dense and believable as software used by a city transport authority.

---

# Visual Style

Use:

- Dark-first interface
- Charcoal / near-black background
- Dark navy surfaces
- White / light-gray typography
- Subtle borders
- Minimal shadows
- Restrained visual effects
- Muted blue as the primary accent
- Green only for healthy / active states
- Amber for warnings
- Red for critical events

Avoid:

- Neon rainbow colors
- Excessive gradients
- Excessive glow
- Heavy glassmorphism
- Huge KPI cards
- Excessive rounded containers
- Decorative elements without information value

The interface should prioritize:

**Information density → readability → usability → visual polish**

---

# Main Map Experience

The map should be the primary visual element.

Use the existing **Google Maps integration**.

The map should support:

- Pan
- Zoom
- Fullscreen
- Map style switching
- Bus markers
- Route polylines
- Event markers
- Layer visibility
- Event filtering
- Bus selection

## Map Layers

Provide functional toggles for:

```text
[✓] Buses
[✓] Routes
[✓] Road Defects
[✓] Traffic
[✓] Waterlogging
[✓] Incidents
[✓] Infrastructure
```

Turning a layer off must immediately hide its corresponding map objects.

---

# Map Styles

Provide a compact style selector:

```text
[ Satellite ] [ Streets ] [ Hybrid ]
```

Keep the controls minimal and operational.

---

# Additional Map Toggles

Provide functional toggles for:

```text
[ Traffic Layer ]
[ 3D View ]
[ Labels ]
[ Weather ]
```

These controls should have real functionality where supported.

Do not create fake controls that do nothing.

---

# Bus Visualization

Bus markers should use a restrained blue visual language.

Each bus marker should allow interaction.

Selecting a bus should:

1. Center the map on the bus.
2. Display its telemetry.
3. Display its route.
4. Display recent events.

### Bus Detail Example

```text
BUS-021
Route: 21A

Speed:
42 km/h

Heading:
East

Status:
Active

Last seen:
8 sec ago
```

---

# Event Visualization

Use restrained, readable event markers.

Supported event categories include:

- Potholes
- Road damage
- Traffic congestion
- Waterlogging
- Traffic signs
- Zebra crossings
- Pedestrian risk
- Incidents
- Infrastructure issues

Avoid oversized glowing markers.

Markers should remain subtle until selected.

---

# Event Detail Panel

When an event is selected, open a compact floating information panel.

Example:

```text
Pothole Detected

Location:
Avinashi Road, Coimbatore

Confidence:
92%

Severity:
High

Reported by:
BUS-021

First seen:
19 Sep 2025, 05:18 PM

Observed by:
3 buses

Status:
Unresolved
```

Available actions:

- View on Map
- Acknowledge
- Resolve
- Open Evidence

---

# Left Sidebar

Create a collapsible control panel.

Recommended sections:

## Layers

```text
Buses
Routes
Road Defects
Traffic
Waterlogging
Incidents
Infrastructure
```

## Map Controls

```text
Satellite
Streets
Hybrid
Traffic Layer
3D View
Labels
Weather
```

## Live Status

Show compact system health indicators:

```text
API               Online
Database          Online
Simulator         Running
Last Sync         8 sec ago
```

Use small status indicators rather than large cards.

---

# Right Intelligence Panel

Create a collapsible right-side panel containing:

## Fleet Status

Show:

```text
Active
Idle
Offline
Total
```

Example:

```text
Active     28
Idle        4
Offline     4
Total      36
```

## Recent Events

Use compact rows.

Example:

```text
Pothole Detected
Avinashi Road
BUS-021 · 92%
2 min ago
```

```text
Traffic Congestion
100 Feet Road
High density
5 min ago
```

```text
Waterlogging
R.S. Puram
BUS-014 · 78%
8 min ago
```

## Quick Statistics

Show compact operational metrics such as:

- Total events
- Road defects
- Active incidents
- Average response time
- Active buses

---

# Event Status Model

Events should use meaningful operational states:

```text
New
Acknowledged
Investigating
Resolved
```

Do not use vague labels such as "Threat" for normal road defects.

Prefer:

- Event
- Hazard
- Road Defect
- Infrastructure Issue
- Incident

---

# Functional Requirements

The UI must remain connected to the existing backend/API.

Do not redesign or break existing API contracts.

Continue using simulated bus/event data for now.

The dashboard must support:

- Live bus positions
- Simulated event updates
- Event filtering
- Layer toggles
- Marker interaction
- Bus selection
- Event selection
- Event details
- Fleet status
- System health
- Map style switching
- Responsive behaviour
- Collapsible panels

---

# Actual Data Flow

The final production architecture is:

```text
Bus Cameras
    ↓
Edge AI Device
    ↓
Detection + Tracking
    ↓
Event Engine
    ↓
GPS + Timestamp + Confidence
    ↓
HTTPS / MQTT
    ↓
Central Backend
    ↓
PostgreSQL + PostGIS
    ↓
Urban Intelligence Platform
    ↓
Google Maps / GIS Dashboard
    ↓
Transport Authorities
```

During current development:

```text
Simulator
    ↓
FastAPI
    ↓
PostgreSQL + PostGIS
    ↓
Dashboard
```

The dashboard should be designed so that the simulator can later be replaced by real Jetson-generated events without a frontend rewrite.

---

# Core UX Principle

The first screen should immediately answer:

> **What is happening on the city's roads right now?**

A user should be able to quickly understand:

- Where the buses are
- Where problems are occurring
- Which roads are congested
- Which infrastructure issues are active
- Which incidents require attention
- Whether the sensing system is operational

The design should feel like a **real city transport operations platform**, not a design mockup.

---

# Implementation Priority

Build in this order:

1. Map-first layout
2. Bus visualization
3. Layer toggles
4. Event visualization
5. Event details
6. Fleet panel
7. Live activity panel
8. System status
9. Map controls
10. Responsive behaviour
11. Final visual polish

Do not add unnecessary features before these are stable.

---

# Final Design Statement

The reference images provide inspiration for the **information architecture and operational GIS experience**.

The implementation must remain firmly centered around:

**PUBLIC TRANSPORT BUSES + EDGE AI + GPS + URBAN ROAD INTELLIGENCE**

The result should look like a practical, production-oriented command center for city transport and infrastructure monitoring.
