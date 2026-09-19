'use client';

import React from 'react';
import {
  Box,
  CloudRain,
  Compass,
  Maximize2,
  Minus,
  Plus,
  Signpost,
  Tag,
} from 'lucide-react';

import type { MapOptionsState, MapStyleKey } from '@/types';
import { MAP_STYLE_LABELS } from '@/lib/map_styles';
import { Segmented } from '@/components/ops/primitives';
import { cn } from '@/lib/utils';

interface MapToolbarProps {
  mapStyle: MapStyleKey;
  onMapStyleChange: (next: MapStyleKey) => void;
  options: MapOptionsState;
  onOptionChange: (key: keyof MapOptionsState, next: boolean) => void;
  radarAvailable: boolean;
  onZoom: (delta: number) => void;
  onFitFleet: () => void;
  onFullscreen: () => void;
}

function IconToggle({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center border transition-colors',
        disabled
          ? 'cursor-not-allowed border-line bg-panel text-faint opacity-40'
          : active
          ? 'border-accent-line bg-accent-soft text-accent'
          : 'border-line bg-panel text-dim hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center border border-line bg-panel text-dim transition-colors hover:text-ink"
    >
      {children}
    </button>
  );
}

export function MapToolbar({
  mapStyle,
  onMapStyleChange,
  options,
  onOptionChange,
  radarAvailable,
  onZoom,
  onFitFleet,
  onFullscreen,
}: MapToolbarProps) {
  const styleOptions = (Object.keys(MAP_STYLE_LABELS) as MapStyleKey[]).map((key) => ({
    value: key,
    label: MAP_STYLE_LABELS[key],
  }));
  const tiltUnavailable = mapStyle === 'streets';

  return (
    <>
      <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2">
        <Segmented
          className="shadow-float"
          options={styleOptions}
          value={mapStyle}
          onChange={onMapStyleChange}
        />
        <div className="flex gap-1">
          <IconToggle
            label="Live traffic"
            active={options.trafficLayer}
            onClick={() => onOptionChange('trafficLayer', !options.trafficLayer)}
          >
            <Signpost className="h-3.5 w-3.5" />
          </IconToggle>
          <IconToggle
            label={tiltUnavailable ? '3D view needs satellite or hybrid' : '3D view'}
            active={options.threeD && !tiltUnavailable}
            disabled={tiltUnavailable}
            onClick={() => onOptionChange('threeD', !options.threeD)}
          >
            <Box className="h-3.5 w-3.5" />
          </IconToggle>
          <IconToggle
            label="Labels"
            active={options.labels}
            onClick={() => onOptionChange('labels', !options.labels)}
          >
            <Tag className="h-3.5 w-3.5" />
          </IconToggle>
          <IconToggle
            label={radarAvailable ? 'Rain radar' : 'Rain radar unavailable'}
            active={options.weather && radarAvailable}
            disabled={!radarAvailable}
            onClick={() => onOptionChange('weather', !options.weather)}
          >
            <CloudRain className="h-3.5 w-3.5" />
          </IconToggle>
        </div>
      </div>

      <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-1">
        <MapButton label="Zoom in" onClick={() => onZoom(1)}>
          <Plus className="h-3.5 w-3.5" />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => onZoom(-1)}>
          <Minus className="h-3.5 w-3.5" />
        </MapButton>
        <MapButton label="Fit the whole fleet" onClick={onFitFleet}>
          <Compass className="h-3.5 w-3.5" />
        </MapButton>
        <MapButton label="Fullscreen map" onClick={onFullscreen}>
          <Maximize2 className="h-3.5 w-3.5" />
        </MapButton>
      </div>
    </>
  );
}
