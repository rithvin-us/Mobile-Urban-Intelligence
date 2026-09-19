import { useEffect, useState } from 'react';

import { cachedPlaceName, reverseGeocode } from '@/lib/geocode';

/**
 * Street-level name for a coordinate. Returns the coordinate itself until the
 * geocoder answers, so rows never collapse while a lookup is in flight.
 */
export function usePlaceName(
  lat: number | null | undefined,
  lng: number | null | undefined,
  enabled = true
): string {
  const fallback =
    lat === null || lat === undefined || lng === null || lng === undefined
      ? '—'
      : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  const [name, setName] = useState<string>(() =>
    lat !== null && lat !== undefined && lng !== null && lng !== undefined
      ? cachedPlaceName(lat, lng) ?? fallback
      : fallback
  );

  useEffect(() => {
    if (!enabled || lat === null || lat === undefined || lng === null || lng === undefined) return;

    const cached = cachedPlaceName(lat, lng);
    if (cached) {
      setName(cached);
      return;
    }

    let active = true;
    setName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    reverseGeocode(lat, lng).then((resolved) => {
      if (active) setName(resolved);
    });

    return () => {
      active = false;
    };
  }, [lat, lng, enabled]);

  return name;
}
