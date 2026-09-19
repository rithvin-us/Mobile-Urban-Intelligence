export type BusStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface Bus {
  id: string;
  bus_number: string;
  route_name: string;
  status: BusStatus;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  last_seen: string;
}

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

export type EventStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

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
  metadata?: Record<string, any>;
}
