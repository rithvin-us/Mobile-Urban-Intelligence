import type {
  Bus,
  DetectionEvent,
  EventCluster,
  FleetCounts,
  FleetState,
} from '@/types';
import { ageSeconds, parseApiTime } from '@/lib/format';

/** A bus that has not reported within this window is treated as offline. */
export const OFFLINE_AFTER_SECONDS = 120;
/** Below this speed a reporting bus is standing at a halt or in a jam. */
export const IDLE_SPEED_KMPH = 5;

export function fleetState(bus: Bus, now = Date.now()): FleetState {
  const age = ageSeconds(bus.last_seen, now);
  if (age === null || age > OFFLINE_AFTER_SECONDS || bus.status === 'INACTIVE') {
    return 'OFFLINE';
  }
  if (bus.status === 'MAINTENANCE' || bus.speed < IDLE_SPEED_KMPH) return 'IDLE';
  return 'ACTIVE';
}

export function fleetCounts(buses: Bus[], now = Date.now()): FleetCounts {
  const counts: FleetCounts = { active: 0, idle: 0, offline: 0, total: buses.length };
  for (const bus of buses) {
    const state = fleetState(bus, now);
    if (state === 'ACTIVE') counts.active += 1;
    else if (state === 'IDLE') counts.idle += 1;
    else counts.offline += 1;
  }
  return counts;
}

export const FLEET_STATE_LABELS: Record<FleetState, string> = {
  ACTIVE: 'Active',
  IDLE: 'Idle',
  OFFLINE: 'Offline',
};

export const FLEET_STATE_COLORS: Record<FleetState, string> = {
  ACTIVE: '#4F9D77',
  IDLE: '#C9922F',
  OFFLINE: '#68798A',
};

/**
 * Repeat sightings of one physical defect. Detections of the same class within
 * roughly 60 m are the same fault seen by different buses on different passes.
 */
const CLUSTER_PRECISION = 3.3; // decimal places, ~60 m at this latitude

function clusterKey(event: DetectionEvent): string {
  const factor = 10 ** CLUSTER_PRECISION;
  const lat = Math.round(event.latitude * factor) / factor;
  const lng = Math.round(event.longitude * factor) / factor;
  return `${event.event_type}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
}

export function buildClusters(events: DetectionEvent[]): Map<string, EventCluster> {
  const clusters = new Map<string, EventCluster>();

  for (const event of events) {
    const key = clusterKey(event);
    const existing = clusters.get(key);
    if (!existing) {
      clusters.set(key, {
        key,
        eventIds: [event.id],
        busIds: [event.bus_id],
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        sightings: 1,
      });
      continue;
    }

    existing.eventIds.push(event.id);
    if (!existing.busIds.includes(event.bus_id)) existing.busIds.push(event.bus_id);
    existing.sightings += 1;
    const ts = parseApiTime(event.timestamp) ?? 0;
    if (ts < (parseApiTime(existing.firstSeen) ?? 0)) existing.firstSeen = event.timestamp;
    if (ts > (parseApiTime(existing.lastSeen) ?? 0)) existing.lastSeen = event.timestamp;
  }

  return clusters;
}

export function clusterFor(
  event: DetectionEvent,
  clusters: Map<string, EventCluster>
): EventCluster | undefined {
  return clusters.get(clusterKey(event));
}

/**
 * Mean time from detection to closure, over the events that have been resolved.
 * Returns null while nothing has been resolved yet — the panel then says so
 * rather than showing a number nobody can trust.
 */
export function averageResponseMinutes(events: DetectionEvent[]): number | null {
  const durations: number[] = [];
  for (const event of events) {
    const detected = parseApiTime(event.timestamp);
    const closed = parseApiTime(event.resolved_at ?? null);
    if (detected === null || closed === null || closed < detected) continue;
    durations.push((closed - detected) / 60000);
  }
  if (!durations.length) return null;
  return durations.reduce((sum, value) => sum + value, 0) / durations.length;
}

export function isOpen(event: DetectionEvent): boolean {
  return event.status !== 'RESOLVED';
}

export function busLookup(buses: Bus[]): Map<string, Bus> {
  return new Map(buses.map((bus) => [bus.id, bus]));
}
