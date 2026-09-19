/**
 * Precipitation radar overlay from RainViewer's public tile service. Used for
 * the Weather switch: if the service cannot be reached the switch is disabled
 * rather than shown as a control that does nothing.
 */

const RAINVIEWER_INDEX = 'https://api.rainviewer.com/public/weather-maps.json';

let probe: Promise<string | null> | null = null;

export function radarTileTemplate(): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (probe) return probe;

  probe = (async () => {
    try {
      const res = await fetch(RAINVIEWER_INDEX, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const frames: { path: string }[] = data?.radar?.past ?? [];
      const latest = frames[frames.length - 1];
      if (!data?.host || !latest?.path) return null;
      // {z}/{x}/{y} are substituted per tile; 2 = colour scheme, 1_1 = smooth+snow.
      return `${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
    } catch (err) {
      console.warn('Precipitation radar unavailable', err);
      return null;
    }
  })();

  return probe;
}
