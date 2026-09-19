import { Bus, DetectionEvent, EventStatus, SystemHealth } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error(`Request failed: ${path}`, err);
    return fallback;
  }
}

export async function fetchBuses(): Promise<Bus[]> {
  return getJson<Bus[]>('/api/buses', []);
}

export async function fetchEvents(limit = 250): Promise<DetectionEvent[]> {
  return getJson<DetectionEvent[]>(`/api/events?limit=${limit}`, []);
}

export async function fetchSystemHealth(): Promise<SystemHealth | null> {
  return getJson<SystemHealth | null>('/health/system', null);
}

/** Records an operator decision on an event. Returns the updated event. */
export async function updateEventStatus(
  eventId: string,
  status: EventStatus
): Promise<DetectionEvent | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as DetectionEvent;
  } catch (err) {
    console.error('Could not update event status', err);
    return null;
  }
}
