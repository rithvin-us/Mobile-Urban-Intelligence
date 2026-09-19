import { CITY_NAME } from '@/lib/routes';
import { loadGoogleMaps } from '@/lib/maps_loader';

/**
 * Street names for detections.
 *
 * Geocoding is metered, and a live map issues far more lookups than it needs:
 * results are cached per ~10 m tile, requests are spaced out and capped per
 * minute, and repeated failures park the service for a while. Whenever a name
 * is not available the coordinate is shown instead, which is still usable.
 */

const MIN_GAP_MS = 350;
const MAX_PER_MINUTE = 24;
const FAILURE_LIMIT = 3;
const BACKOFF_MS = 5 * 60 * 1000;

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

let chain: Promise<unknown> = Promise.resolve();
let geocoder: google.maps.Geocoder | null = null;
let windowStart = 0;
let windowCount = 0;
let failures = 0;
let pausedUntil = 0;

function tileKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function coordinateText(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function budgetAvailable(): boolean {
  const now = Date.now();
  if (now < pausedUntil) return false;
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  return windowCount < MAX_PER_MINUTE;
}

function pickPlaceName(results: google.maps.GeocoderResult[]): string | null {
  for (const result of results) {
    const components = result.address_components ?? [];
    const road = components.find((c) => c.types.includes('route'));
    const area =
      components.find((c) => c.types.includes('sublocality_level_1')) ??
      components.find((c) => c.types.includes('sublocality')) ??
      components.find((c) => c.types.includes('neighborhood'));
    const city =
      components.find((c) => c.types.includes('locality')) ??
      components.find((c) => c.types.includes('administrative_area_level_3'));

    const head = road?.long_name ?? area?.long_name;
    if (!head) continue;
    const tail = road && area ? area.long_name : city?.long_name ?? CITY_NAME;
    return tail && tail !== head ? `${head}, ${tail}` : head;
  }
  return null;
}

/** Resolves a coordinate to a street-level description, or the coordinate itself. */
export function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = tileKey(lat, lng);
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  if (!budgetAvailable()) return Promise.resolve(coordinateText(lat, lng));

  windowCount += 1;

  const request = chain
    .catch(() => undefined)
    .then(async () => {
      const maps = await loadGoogleMaps();
      if (!geocoder) geocoder = new maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      const resolved = pickPlaceName(response.results ?? []) ?? coordinateText(lat, lng);
      cache.set(key, resolved);
      failures = 0;
      return resolved;
    })
    .catch((err) => {
      failures += 1;
      if (failures >= FAILURE_LIMIT) {
        pausedUntil = Date.now() + BACKOFF_MS;
        failures = 0;
        console.warn('Pausing reverse geocoding for five minutes', err);
      }
      // Not cached: a transient failure should not pin the coordinate forever.
      return coordinateText(lat, lng);
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, request);
  chain = request.then(() => new Promise((resolve) => setTimeout(resolve, MIN_GAP_MS)));
  return request;
}

export function cachedPlaceName(lat: number, lng: number): string | undefined {
  return cache.get(tileKey(lat, lng));
}
