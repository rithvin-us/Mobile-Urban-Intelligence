'use client';

import React from 'react';

import type { LayerKey, LayerState } from '@/types';
import { LAYER_COLORS, LAYER_LABELS } from '@/lib/format';

const LEGEND_ORDER: LayerKey[] = [
  'defects',
  'traffic',
  'waterlogging',
  'incidents',
  'infrastructure',
];

/**
 * Reads the map for someone who did not build it: colour is the detection
 * class, size is severity. Only layers currently drawn are listed, so the
 * legend never explains a colour that is not on screen.
 */
export function MarkerLegend({ layers }: { layers: LayerState }) {
  const shown = LEGEND_ORDER.filter((key) => layers[key]);
  if (shown.length === 0) return null;

  return (
    <div className="glass pointer-events-auto rounded-panel px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {shown.map((key) => (
          <span key={key} className="flex items-center gap-1.5 text-mini text-dim">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: LAYER_COLORS[key] }}
              aria-hidden
            />
            {LAYER_LABELS[key]}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-micro text-faint">Bigger marker means higher severity.</p>
    </div>
  );
}
