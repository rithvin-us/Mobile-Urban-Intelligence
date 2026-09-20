/**
 * Scripted demo fleet.
 *
 * Runs the whole console with no API, no database and no network: buses drive
 * the real route geometry in `routes.ts`, and detections appear from a fixed
 * script so a recording shows the same story every take. Nothing here talks to
 * `lib/api.ts`, so a dead backend cannot interrupt a demo.
 *
 * The data it produces is the same shape the API returns, so every panel, card,
 * filter and export downstream is exercised for real — this is a different data
 * source, not a different dashboard.
 */

import type {
  Bus,
  BusStatus,
  DetectionEvent,
  EventSeverity,
  EventType,
  SystemHealth,
} from '@/types';
import { ROUTES } from '@/lib/routes';

export interface DemoOptions {
  /** Wall-clock seconds of scripted story per real second. 1 = real time. */
  speed: number;
  fleetSize: number;
}

export const DEMO_DEFAULTS: DemoOptions = { speed: 1, fleetSize: 24 };

/** Deterministic PRNG so every recording of the demo is identical. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function headingBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Cumulative leg lengths so a bus advances at a steady speed, not per-leg. */
interface RouteTrack {
  id: string;
  path: { lat: number; lng: number }[];
  cumulative: number[];
  length: number;
}

function buildTrack(id: string, path: { lat: number; lng: number }[]): RouteTrack {
  const cumulative = [0];
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const dLat = (path[i + 1].lat - path[i].lat) * 111.32;
    const dLng =
      (path[i + 1].lng - path[i].lng) * 111.32 * Math.cos((path[i].lat * Math.PI) / 180);
    total += Math.hypot(dLat, dLng);
    cumulative.push(total);
  }
  return { id, path, cumulative, length: total || 1 };
}

const TRACKS: RouteTrack[] = Object.values(ROUTES).map((route) =>
  buildTrack(route.id, route.path)
);

function pointAt(track: RouteTrack, distanceKm: number) {
  const d = ((distanceKm % track.length) + track.length) % track.length;
  let i = 0;
  while (i < track.cumulative.length - 2 && track.cumulative[i + 1] < d) i += 1;
  const segStart = track.cumulative[i];
  const segLen = Math.max(1e-6, track.cumulative[i + 1] - segStart);
  const t = Math.min(1, Math.max(0, (d - segStart) / segLen));
  const a = track.path[i];
  const b = track.path[i + 1] ?? track.path[i];
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    heading: headingBetween(a, b),
  };
}

interface DemoBusState {
  id: string;
  bus_number: string;
  track: RouteTrack;
  offsetKm: number;
  speedKmh: number;
  status: BusStatus;
  /** Seconds of the scripted minute this bus spends stopped at a halt. */
  dwellStart: number;
  dwellLength: number;
}

/**
 * Fixed road faults on the corridors. Buses passing one report it, which is
 * what produces repeat sightings of a single defect from different vehicles —
 * the signal a municipal officer actually acts on.
 */
interface Hotspot {
  routeId: string;
  atKm: number;
  type: EventType;
  severity: EventSeverity;
  place: string;
}

const HOTSPOTS: Hotspot[] = [
  { routeId: '101', atKm: 12, type: 'POTHOLE', severity: 'CRITICAL', place: 'Thudiyalur bypass' },
  { routeId: '101', atKm: 34, type: 'ROAD_DAMAGE', severity: 'HIGH', place: 'Karamadai approach' },
  { routeId: '101', atKm: 5, type: 'TRAFFIC', severity: 'MEDIUM', place: 'Saibaba Colony' },
  { routeId: '202', atKm: 9, type: 'WATERLOGGING', severity: 'HIGH', place: 'Neelambur toll' },
  { routeId: '202', atKm: 26, type: 'POTHOLE', severity: 'HIGH', place: 'Karumathampatti' },
  { routeId: '202', atKm: 40, type: 'TRAFFIC', severity: 'CRITICAL', place: 'Avinashi bypass' },
  { routeId: '303', atKm: 14, type: 'ROAD_DAMAGE', severity: 'MEDIUM', place: 'Kinathukadavu' },
  { routeId: '303', atKm: 30, type: 'PEDESTRIAN_RISK', severity: 'HIGH', place: 'Pollachi market' },
  { routeId: '404', atKm: 8, type: 'ZEBRA_CROSSING', severity: 'LOW', place: 'Annur town' },
  { routeId: '404', atKm: 21, type: 'POTHOLE', severity: 'MEDIUM', place: 'Sirumugai road' },
  { routeId: '505', atKm: 11, type: 'WATERLOGGING', severity: 'CRITICAL', place: 'Walayar ghat' },
  { routeId: '505', atKm: 25, type: 'TRAFFIC_SIGN', severity: 'LOW', place: 'Kanjikode junction' },
  { routeId: '606', atKm: 7, type: 'INCIDENT', severity: 'HIGH', place: 'Sulur crossing' },
  { routeId: '606', atKm: 18, type: 'ROAD_DAMAGE', severity: 'HIGH', place: 'Palladam trunk road' },
  { routeId: '14C', atKm: 4, type: 'POTHOLE', severity: 'HIGH', place: 'Vadavalli' },
  { routeId: '21A', atKm: 6, type: 'TRAFFIC', severity: 'HIGH', place: 'Airport road' },
  { routeId: '70', atKm: 3, type: 'WATERLOGGING', severity: 'MEDIUM', place: 'Ganapathy' },
  { routeId: '45', atKm: 5, type: 'POTHOLE', severity: 'CRITICAL', place: 'Singanallur' },
];

const EVIDENCE: Record<string, string> = {
  POTHOLE: '/evidence/pothole_sample.jpg',
  ROAD_DAMAGE: '/evidence/road_damage_sample.jpg',
  WATERLOGGING: '/evidence/waterlogging_sample.jpg',
  TRAFFIC: '/evidence/traffic_sample.jpg',
  INCIDENT: '/evidence/incident_sample.jpg',
};

const MODEL_LABEL: Partial<Record<EventType, string>> = {
  POTHOLE: 'pothole',
  WATERLOGGING: 'waterlogging',
  ROAD_DAMAGE: 'cracks',
};

/**
 * Drives the scripted fleet. Call `sample()` as often as the UI likes: it is a
 * pure function of elapsed time, so the fleet never stutters if a frame is
 * dropped and the story can be scrubbed or restarted.
 */
export class DemoEngine {
  private readonly buses: DemoBusState[];
  private readonly startedAt: number;
  private readonly rand: () => number;
  private events: DetectionEvent[] = [];
  private seen = new Set<string>();
  private options: DemoOptions;

  constructor(options: Partial<DemoOptions> = {}) {
    this.options = { ...DEMO_DEFAULTS, ...options };
    this.rand = mulberry32(26124);
    this.startedAt = Date.now();
    this.buses = this.buildFleet();
    this.seedHistory();
  }

  setSpeed(speed: number) {
    this.options.speed = speed;
  }

  private buildFleet(): DemoBusState[] {
    const fleet: DemoBusState[] = [];
    for (let i = 1; i <= this.options.fleetSize; i += 1) {
      const track = TRACKS[(i - 1) % TRACKS.length];
      // Every twelfth vehicle is in the depot, so the fleet tiles are never
      // uniformly green and the "offline" state is visible in a recording.
      const status: BusStatus = i % 12 === 0 ? 'MAINTENANCE' : 'ACTIVE';
      fleet.push({
        id: `bus-${String(i).padStart(3, '0')}`,
        bus_number: `BUS-${String(i).padStart(3, '0')}`,
        track,
        offsetKm: this.rand() * track.length,
        speedKmh: status === 'MAINTENANCE' ? 0 : 26 + this.rand() * 28,
        status,
        dwellStart: this.rand() * 60,
        dwellLength: 6 + this.rand() * 8,
      });
    }
    return fleet;
  }

  /** Detections from before the demo started, so the console opens with history. */
  private seedHistory() {
    const now = Date.now();
    for (let i = 0; i < 46; i += 1) {
      const spot = HOTSPOTS[Math.floor(this.rand() * HOTSPOTS.length)];
      const minutesAgo = 4 + this.rand() * 260;
      const bus = this.buses[Math.floor(this.rand() * this.buses.length)];
      const roll = this.rand();
      const status =
        roll > 0.78 ? 'RESOLVED' : roll > 0.6 ? 'ACKNOWLEDGED' : 'NEW';
      const event = this.makeEvent(
        spot,
        bus,
        new Date(now - minutesAgo * 60_000),
        `demo-seed-${i}`
      );
      event.status = status;
      if (status !== 'NEW') {
        event.acknowledged_at = new Date(
          now - (minutesAgo - 2 - this.rand() * 20) * 60_000
        ).toISOString();
      }
      if (status === 'RESOLVED') {
        event.resolved_at = new Date(
          now - (minutesAgo - 8 - this.rand() * 60) * 60_000
        ).toISOString();
      }
      this.events.push(event);
    }
    this.events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private makeEvent(
    spot: Hotspot,
    bus: DemoBusState,
    at: Date,
    id: string
  ): DetectionEvent {
    const track = TRACKS.find((t) => t.id === spot.routeId) ?? TRACKS[0];
    const point = pointAt(track, spot.atKm);
    const jitter = () => (this.rand() - 0.5) * 0.00045;
    const confidence = 0.62 + this.rand() * 0.36;
    return {
      id,
      bus_id: bus.id,
      event_type: spot.type,
      confidence: Number(confidence.toFixed(2)),
      severity: spot.severity,
      latitude: Number((point.lat + jitter()).toFixed(6)),
      longitude: Number((point.lng + jitter()).toFixed(6)),
      timestamp: at.toISOString(),
      status: 'NEW',
      evidence_url: EVIDENCE[spot.type] ?? '/evidence/default_sample.jpg',
      acknowledged_at: null,
      resolved_at: null,
      metadata: {
        bus_number: bus.bus_number,
        route_name: track.id,
        location_name: spot.place,
        speed_kmph: Number(bus.speedKmh.toFixed(1)),
        detection_source: 'EDGE_AI_ONBOARD_CAM',
        model: 'YOLOv8-Multilabel-150epochs',
        defect_class: MODEL_LABEL[spot.type] ?? spot.type.toLowerCase(),
        inference_ms: Math.round(18 + this.rand() * 26),
        officer_action:
          spot.severity === 'HIGH' || spot.severity === 'CRITICAL'
            ? 'DISPATCH_REPAIR_CREW'
            : 'SCHEDULE_INSPECTION',
      },
    };
  }

  /** Current fleet positions and the detections reported so far. */
  sample(): { buses: Bus[]; events: DetectionEvent[]; health: SystemHealth } {
    const now = Date.now();
    const elapsedSec = ((now - this.startedAt) / 1000) * this.options.speed;
    const nowIso = new Date(now).toISOString();

    const buses: Bus[] = this.buses.map((state) => {
      const cycle = elapsedSec % 60;
      const dwelling =
        state.status === 'ACTIVE' &&
        cycle >= state.dwellStart &&
        cycle < state.dwellStart + state.dwellLength;

      const travelled = state.offsetKm + (state.speedKmh / 3600) * elapsedSec;
      const point = pointAt(state.track, travelled);
      const speed = state.status === 'MAINTENANCE' ? 0 : dwelling ? 0 : state.speedKmh;

      // A stopped bus still reports; only a depot vehicle goes quiet, which is
      // what drives the offline tile in the fleet panel.
      const lastSeen =
        state.status === 'MAINTENANCE'
          ? new Date(now - 1000 * 240).toISOString()
          : nowIso;

      return {
        id: state.id,
        bus_id: state.id,
        bus_number: state.bus_number,
        route_name: state.track.id,
        status: state.status,
        latitude: Number(point.lat.toFixed(6)),
        longitude: Number(point.lng.toFixed(6)),
        heading: Number(point.heading.toFixed(1)),
        speed: Number(speed.toFixed(1)),
        last_seen: lastSeen,
      };
    });

    this.collectDetections(buses, now);

    const health: SystemHealth = {
      api: 'ONLINE',
      database: 'ONLINE',
      ingest: 'RUNNING',
      last_telemetry: nowIso,
      telemetry_age_seconds: 0,
      buses: buses.length,
      events: this.events.length,
      server_time: nowIso,
    };

    return { buses, events: this.events, health };
  }

  /** A bus within ~150 m of a fault reports it, once per pass. */
  private collectDetections(buses: Bus[], now: number) {
    for (const bus of buses) {
      if (bus.status === 'MAINTENANCE' || bus.speed === 0) continue;
      const busState = this.buses.find((b) => b.id === bus.id);
      if (!busState) continue;

      for (const spot of HOTSPOTS) {
        if (spot.routeId !== busState.track.id) continue;
        const point = pointAt(busState.track, spot.atKm);
        const dLat = (bus.latitude - point.lat) * 111_320;
        const dLng =
          (bus.longitude - point.lng) * 111_320 * Math.cos((bus.latitude * Math.PI) / 180);
        if (Math.hypot(dLat, dLng) > 150) continue;

        // One report per bus per pass: the pass index changes once the bus has
        // gone all the way round, so the same fault reports again next lap.
        const lap = Math.floor(
          (busState.offsetKm + (busState.speedKmh / 3600) * ((now - this.startedAt) / 1000)) /
            busState.track.length
        );
        const key = `${bus.id}:${spot.routeId}:${spot.atKm}:${lap}`;
        if (this.seen.has(key)) continue;
        this.seen.add(key);

        const event = this.makeEvent(spot, busState, new Date(now), `demo-${key}`);
        this.events.unshift(event);
      }
    }

    if (this.events.length > 400) this.events.length = 400;
  }

  /** Applies an operator decision locally, exactly as the API would. */
  setStatus(eventId: string, status: DetectionEvent['status']): DetectionEvent | null {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return null;
    const nowIso = new Date().toISOString();
    event.status = status;
    if (status === 'ACKNOWLEDGED' || status === 'INVESTIGATING' || status === 'IN_PROGRESS') {
      event.acknowledged_at = event.acknowledged_at ?? nowIso;
    }
    event.resolved_at = status === 'RESOLVED' ? nowIso : null;
    if (status === 'NEW') event.acknowledged_at = null;
    return { ...event };
  }

  /** Puts a fresh critical detection on screen on cue, for a live walkthrough. */
  injectCritical(): DetectionEvent {
    const spot =
      HOTSPOTS.find((h) => h.severity === 'CRITICAL' && h.type === 'POTHOLE') ?? HOTSPOTS[0];
    const bus = this.buses[0];
    const event = this.makeEvent(spot, bus, new Date(), `demo-inject-${Date.now()}`);
    event.confidence = 0.96;
    this.events.unshift(event);
    return event;
  }
}
