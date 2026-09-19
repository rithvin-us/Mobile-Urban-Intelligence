export type BusStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface Bus {
  id: string;
  bus_id?: string;
  bus_number: string;
  route_name: string;
  status: BusStatus;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  last_seen: string;
}

/** Operational state shown in the fleet panel, derived from telemetry freshness. */
export type FleetState = 'ACTIVE' | 'IDLE' | 'OFFLINE';

export type EventType =
  | 'POTHOLE'
  | 'ROAD_DAMAGE'
  | 'WATERLOGGING'
  | 'TRAFFIC'
  | 'TRAFFIC_SIGN'
  | 'ZEBRA_CROSSING'
  | 'PEDESTRIAN_RISK'
  | 'INCIDENT';

export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EventStatus =
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'IN_PROGRESS'
  | 'RESOLVED';

export interface DetectionEvent {
  id: string;
  bus_id: string;
  event_type: EventType;
  confidence: number;
  severity: EventSeverity;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: EventStatus;
  evidence_url?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  /** The API serialises the JSON column under its alias; both keys are accepted. */
  metadata?: Record<string, any> | null;
  metadata_payload?: Record<string, any> | null;
}

/** Map layers the operator can switch on and off. */
export type LayerKey =
  | 'buses'
  | 'routes'
  | 'defects'
  | 'traffic'
  | 'waterlogging'
  | 'incidents'
  | 'infrastructure';

export type LayerState = Record<LayerKey, boolean>;

export type MapStyleKey = 'satellite' | 'streets' | 'hybrid';

export interface MapOptionsState {
  trafficLayer: boolean;
  threeD: boolean;
  labels: boolean;
  weather: boolean;
}

export interface SystemHealth {
  api: 'ONLINE' | 'OFFLINE';
  database: 'ONLINE' | 'OFFLINE';
  ingest: 'RUNNING' | 'STALE' | 'STOPPED';
  last_telemetry: string | null;
  telemetry_age_seconds: number | null;
  buses: number;
  events: number;
  server_time: string;
}

export interface FleetCounts {
  active: number;
  idle: number;
  offline: number;
  total: number;
}

/** Repeat sightings of the same defect at the same place, grouped for the detail panel. */
export interface EventCluster {
  key: string;
  eventIds: string[];
  busIds: string[];
  firstSeen: string;
  lastSeen: string;
  sightings: number;
}

export interface DashboardStats {
  totalBuses: number;
  activeBuses: number;
  eventsToday: number;
  roadDefects: number;
  activeIncidents: number;
}
