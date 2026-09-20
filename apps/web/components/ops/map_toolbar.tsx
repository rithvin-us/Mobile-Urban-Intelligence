'use client';

import React from 'react';
import { Box, CloudRain, Compass, Maximize2, Minus, Plus, Signpost, Tag } from 'lucide-react';

import type { MapOptionsState, MapStyleKey } from '@/types';
import { MAP_STYLE_LABELS } from '@/lib/map_styles';
import { IconButton, Segmented } from '@/components/ops/primitives';

interface MapControlBarProps {
  mapStyle: MapStyleKey;
  onMapStyleChange: (next: MapStyleKey) => void;
  options: MapOptionsState;
  onOptionChange: (key: keyof MapOptionsState, next: boolean) => void;
  radarAvailable: boolean;
}

/**
 * Basemap and overlay switches, docked bottom-left.
 *
 * It sits away from the top rail on purpose: the top of the map is where a
 * critical detection announces itself, and nothing else may compete for that
 * space.
 */
export function MapControlBar({
  mapStyle,
  onMapStyleChange,
  options,
  onOptionChange,
  radarAvailable,
}: MapControlBarProps) {
  const styleOptions = (Object.keys(MAP_STYLE_LABELS) as MapStyleKey[]).map((key) => ({
    value: key,
    label: MAP_STYLE_LABELS[key],
  }));
  const tiltUnavailable = mapStyle === 'streets';

  return (
    <div className="glass pointer-events-auto flex items-center gap-2 rounded-panel p-1.5">
      <Segmented options={styleOptions} value={mapStyle} onChange={onMapStyleChange} />
      <span className="h-5 w-px bg-line" aria-hidden />
      <div className="flex gap-1">
        <IconButton
          label="Live traffic"
          active={options.trafficLayer}
          onClick={() => onOptionChange('trafficLayer', !options.trafficLayer)}
        >
          <Signpost className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          label={tiltUnavailable ? '3D view needs satellite or hybrid imagery' : '3D view'}
          active={options.threeD && !tiltUnavailable}
          disabled={tiltUnavailable}
          onClick={() => onOptionChange('threeD', !options.threeD)}
        >
          <Box className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          label="Street and place labels"
          active={options.labels}
          onClick={() => onOptionChange('labels', !options.labels)}
        >
          <Tag className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          label={radarAvailable ? 'Rain radar' : 'Rain radar is unreachable'}
          active={options.weather && radarAvailable}
          disabled={!radarAvailable}
          onClick={() => onOptionChange('weather', !options.weather)}
        >
          <CloudRain className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

interface MapZoomRailProps {
  onZoom: (delta: number) => void;
  onFitFleet: () => void;
  onFullscreen: () => void;
}

/** Vertical zoom rail, docked right so it never meets the top alert lane. */
export function MapZoomRail({ onZoom, onFitFleet, onFullscreen }: MapZoomRailProps) {
  return (
    <div className="glass pointer-events-auto flex flex-col gap-1 rounded-panel p-1.5">
      <IconButton label="Zoom in" onClick={() => onZoom(1)}>
        <Plus className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Zoom out" onClick={() => onZoom(-1)}>
        <Minus className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Fit the whole fleet (F)" onClick={onFitFleet}>
        <Compass className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Fullscreen map" onClick={onFullscreen}>
        <Maximize2 className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}
