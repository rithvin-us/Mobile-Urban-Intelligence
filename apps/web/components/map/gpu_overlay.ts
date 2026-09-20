/**
 * Detections drawn on the graphics card.
 *
 * A `google.maps.Marker` is a DOM node: the browser lays out, paints and
 * composites one element per detection, on the CPU, every frame the map moves.
 * That is fine for a handful and visibly janky by a few hundred — which is the
 * normal size of a day's road audit.
 *
 * deck.gl's GoogleMapsOverlay shares the map's own WebGL context and uploads
 * the detections once as vertex data, so panning and zooming cost the GPU a
 * draw call instead of costing the CPU a layout pass. Loaded on demand so the
 * WebGL bundle never lands on a session that stays on DOM markers.
 */

import type { DetectionEvent } from '@/types';
import { EVENT_COLORS } from '@/lib/format';

type RGBA = [number, number, number, number];

export interface GpuOverlayHandle {
  update: (events: DetectionEvent[], selectedEventId: string | null) => void;
  destroy: () => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/** Severity drives radius; the detection class drives colour. Never both. */
function radiusFor(event: DetectionEvent, selected: boolean): number {
  if (selected) return 34;
  switch (event.severity) {
    case 'CRITICAL':
      return 26;
    case 'HIGH':
      return 21;
    case 'MEDIUM':
      return 16;
    default:
      return 12;
  }
}

export async function createGpuOverlay(
  map: google.maps.Map,
  onSelectEvent: (eventId: string) => void
): Promise<GpuOverlayHandle | null> {
  try {
    const [{ GoogleMapsOverlay }, { ScatterplotLayer }] = await Promise.all([
      import('@deck.gl/google-maps'),
      import('@deck.gl/layers'),
    ]);

    const overlay = new GoogleMapsOverlay({
      interleaved: false,
      getTooltip: null,
    });
    overlay.setMap(map);

    const update = (events: DetectionEvent[], selectedEventId: string | null) => {
      const layer = new ScatterplotLayer<DetectionEvent>({
        id: 'detections-gpu',
        data: events,
        pickable: true,
        stroked: true,
        filled: true,
        radiusUnits: 'meters',
        radiusMinPixels: 3.5,
        radiusMaxPixels: 22,
        lineWidthMinPixels: 1,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: (d) => radiusFor(d, d.id === selectedEventId),
        getFillColor: (d): RGBA => {
          const [r, g, b] = hexToRgb(EVENT_COLORS[d.event_type] ?? '#C9922F');
          return [r, g, b, d.status === 'RESOLVED' ? 70 : 215];
        },
        getLineColor: (d): RGBA =>
          d.id === selectedEventId ? [234, 242, 250, 255] : [11, 14, 18, 190],
        // deck.gl caches attribute buffers, so it has to be told which inputs
        // changed or a re-render would silently draw the previous frame's data.
        updateTriggers: {
          getRadius: selectedEventId,
          getLineColor: selectedEventId,
          getFillColor: events.length,
        },
        onClick: (info) => {
          if (info.object) {
            onSelectEvent((info.object as DetectionEvent).id);
            return true;
          }
          return false;
        },
      });

      overlay.setProps({ layers: [layer] });
    };

    return {
      update,
      destroy: () => {
        overlay.setMap(null);
        overlay.finalize();
      },
    };
  } catch (err) {
    console.warn('GPU marker layer unavailable; staying on DOM markers.', err);
    return null;
  }
}
