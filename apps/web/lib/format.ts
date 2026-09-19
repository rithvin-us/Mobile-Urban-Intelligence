import type {
  DetectionEvent,
  EventSeverity,
  EventStatus,
  EventType,
  LayerKey,
} from '@/types';

/** Human wording for detection classes, as an operator would say them. */
export const EVENT_LABELS: Record<EventType, string> = {
  POTHOLE: 'Pothole',
  ROAD_DAMAGE: 'Road damage',
  WATERLOGGING: 'Waterlogging',
  TRAFFIC: 'Traffic congestion',
  TRAFFIC_SIGN: 'Damaged traffic sign',
  ZEBRA_CROSSING: 'Faded zebra crossing',
  PEDESTRIAN_RISK: 'Pedestrian safety risk',
  INCIDENT: 'Road incident',
};

/** Operational grouping used by both the layer switches and the legend. */
export const EVENT_LAYER: Record<EventType, LayerKey> = {
  POTHOLE: 'defects',
  ROAD_DAMAGE: 'defects',
  TRAFFIC: 'traffic',
  WATERLOGGING: 'waterlogging',
  INCIDENT: 'incidents',
  PEDESTRIAN_RISK: 'incidents',
  TRAFFIC_SIGN: 'infrastructure',
  ZEBRA_CROSSING: 'infrastructure',
};

/** Muted marker colours: readable on dark imagery, never neon. */
export const EVENT_COLORS: Record<EventType, string> = {
  POTHOLE: '#C9922F',
  ROAD_DAMAGE: '#B5703A',
  WATERLOGGING: '#4E96A6',
  TRAFFIC: '#C7564C',
  TRAFFIC_SIGN: '#8592A3',
  ZEBRA_CROSSING: '#6E8FA6',
  PEDESTRIAN_RISK: '#C0715E',
  INCIDENT: '#D0554A',
};

export const LAYER_COLORS: Record<LayerKey, string> = {
  buses: '#4C86C6',
  routes: '#3A5D80',
  defects: '#C9922F',
  traffic: '#C7564C',
  waterlogging: '#4E96A6',
  incidents: '#D0554A',
  infrastructure: '#8592A3',
};

export const LAYER_LABELS: Record<LayerKey, string> = {
  buses: 'Buses',
  routes: 'Routes',
  defects: 'Road defects',
  traffic: 'Traffic',
  waterlogging: 'Waterlogging',
  incidents: 'Incidents',
  infrastructure: 'Infrastructure',
};

export const SEVERITY_LABELS: Record<EventSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  NEW: 'New',
  ACKNOWLEDGED: 'Acknowledged',
  INVESTIGATING: 'Investigating',
  IN_PROGRESS: 'Investigating',
  RESOLVED: 'Resolved',
};

export function severityTone(severity: EventSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'text-crit';
    case 'HIGH':
      return 'text-crit';
    case 'MEDIUM':
      return 'text-warn';
    default:
      return 'text-dim';
  }
}

export function severityDot(severity: EventSeverity): string {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return '#C7564C';
    case 'MEDIUM':
      return '#C9922F';
    default:
      return '#7C8B99';
  }
}

export function statusTone(status: EventStatus): string {
  switch (status) {
    case 'RESOLVED':
      return 'text-ok';
    case 'NEW':
      return 'text-crit';
    default:
      return 'text-warn';
  }
}

/** Parses API timestamps, which arrive naive-UTC from the backend. */
export function parseApiTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const ms = Date.parse(hasZone ? value : `${value}Z`);
  return Number.isNaN(ms) ? null : ms;
}

export function ageSeconds(value: string | null | undefined, now = Date.now()): number | null {
  const ms = parseApiTime(value);
  if (ms === null) return null;
  return Math.max(0, (now - ms) / 1000);
}

export function relativeTime(value: string | null | undefined, now = Date.now()): string {
  const seconds = ageSeconds(value, now);
  if (seconds === null) return '—';
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${Math.round(seconds)} sec ago`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function shortClock(value: string | null | undefined): string {
  const ms = parseApiTime(value);
  if (ms === null) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fullTimestamp(value: string | null | undefined): string {
  const ms = parseApiTime(value);
  if (ms === null) return '—';
  return new Date(ms).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const COMPASS = ['North', 'North-east', 'East', 'South-east', 'South', 'South-west', 'West', 'North-west'];

export function compass(heading: number): string {
  const index = Math.round((((heading % 360) + 360) % 360) / 45) % 8;
  return COMPASS[index];
}

export function coordinateLabel(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function eventMetadata(event: DetectionEvent): Record<string, any> {
  return event.metadata ?? event.metadata_payload ?? {};
}

export function eventTypeLabel(type: EventType): string {
  return EVENT_LABELS[type] ?? type;
}
