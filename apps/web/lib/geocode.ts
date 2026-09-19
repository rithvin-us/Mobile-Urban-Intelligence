import { CITY_NAME } from '@/lib/routes';
import { loadGoogleMaps } from '@/lib/maps_loader';

/**
 * Street names for detections. Results are cached per ~50 m tile and requests
 * are issued one at a time, so a busy map does not burn through geocoding quota.
 */

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

let chain: Promise<unknown> = Promise.resolve();
let geocoder: google.maps.Geocoder | null = null;

function tileKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
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

  const request = chain
    .catch(() => undefined)
    .then(async () => {
      const maps = await loadGoogleMaps();
      if (!geocoder) geocoder = new maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      const name = pickPlaceName(response.results ?? []);
      const resolved = name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      cache.set(key, resolved);
      return resolved;
    })
    .catch(() => {
      const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      cache.set(key, fallback);
      return fallback;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, request);
  // Space requests out slightly; the geocoder rate-limits bursts.
  chain = request.then(() => new Promise((resolve) => setTimeout(resolve, 120)));
  return request;
}

export function cachedPlaceName(lat: number, lng: number): string | undefined {
  return cache.get(tileKey(lat, lng));
}
