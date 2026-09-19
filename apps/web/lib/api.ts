import { Bus, DetectionEvent } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function fetchBuses(): Promise<Bus[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/buses`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch buses:', err);
    return [];
  }
}

export async function fetchEvents(): Promise<DetectionEvent[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/events`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch events:', err);
    return [];
  }
}
