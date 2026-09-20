'use client';

import React from 'react';
import { Activity, Layers } from 'lucide-react';

import type {
  LayerKey,
  LayerState,
  MapOptionsState,
  MapStyleKey,
  SystemHealth,
} from '@/types';
import { LAYER_COLORS, LAYER_LABELS, relativeTime } from '@/lib/format';
import { MAP_STYLE_LABELS } from '@/lib/map_styles';
import {
  Dot,
  FloatingPanel,
  PanelHeader,
  SectionTitle,
  Segmented,
  SwitchRow,
} from '@/components/ops/primitives';

const LAYER_ORDER: LayerKey[] = [
  'buses',
  'routes',
  'defects',
  'traffic',
  'waterlogging',
  'incidents',
  'infrastructure',
];

interface LeftPanelProps {
  onClose: () => void;
  layers: LayerState;
  layerCounts: Record<LayerKey, number>;
  onLayerChange: (key: LayerKey, next: boolean) => void;
  onAllLayers: (next: boolean) => void;
  mapStyle: MapStyleKey;
  onMapStyleChange: (next: MapStyleKey) => void;
  options: MapOptionsState;
  onOptionChange: (key: keyof MapOptionsState, next: boolean) => void;
  radarAvailable: boolean;
  gpuMarkers: boolean;
  onGpuMarkersChange: (next: boolean) => void;
  health: SystemHealth | null;
  lastSync: number | null;
  now: number;
}

function healthTone(value: string | undefined): string {
  switch (value) {
    case 'ONLINE':
    case 'RUNNING':
      return 'var(--ok)';
    case 'STALE':
      return 'var(--warn)';
    case 'OFFLINE':
    case 'STOPPED':
      return 'var(--crit)';
    default:
      return 'var(--faint)';
  }
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-[5px]">
      <span className="text-mini text-faint">{label}</span>
      <span className="flex items-center gap-1.5">
        <Dot color={healthTone(value)} pulse={value === 'RUNNING'} />
        <span className="text-mini text-dim">
          {value.charAt(0) + value.slice(1).toLowerCase()}
        </span>
      </span>
    </div>
  );
}

export function LeftPanel({
  onClose,
  layers,
  layerCounts,
  onLayerChange,
  onAllLayers,
  mapStyle,
  onMapStyleChange,
  options,
  onOptionChange,
  radarAvailable,
  gpuMarkers,
  onGpuMarkersChange,
  health,
  lastSync,
  now,
}: LeftPanelProps) {
  const styleOptions = (Object.keys(MAP_STYLE_LABELS) as MapStyleKey[]).map((key) => ({
    value: key,
    label: MAP_STYLE_LABELS[key],
  }));

  const tiltUnavailable = mapStyle === 'streets';
  const allOn = LAYER_ORDER.every((key) => layers[key]);

  return (
    <FloatingPanel className="flex max-h-full w-[244px] flex-col">
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-accent" aria-hidden />
            Controls
          </span>
        }
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <SectionTitle
          right={
            <button
              type="button"
              onClick={() => onAllLayers(!allOn)}
              className="rounded px-1.5 py-0.5 text-mini text-faint transition-colors hover:bg-hover/60 hover:text-ink"
            >
              {allOn ? 'Hide all' : 'Show all'}
            </button>
          }
        >
          Map layers
        </SectionTitle>
        <div className="px-1.5">
          {LAYER_ORDER.map((key) => (
            <SwitchRow
              key={key}
              label={LAYER_LABELS[key]}
              color={LAYER_COLORS[key]}
              checked={layers[key]}
              count={layerCounts[key]}
              onChange={(next) => onLayerChange(key, next)}
            />
          ))}
        </div>

        <SectionTitle>Basemap</SectionTitle>
        <div className="px-3">
          <Segmented options={styleOptions} value={mapStyle} onChange={onMapStyleChange} />
        </div>

        <SectionTitle>Map controls</SectionTitle>
        <div className="px-1.5">
          <SwitchRow
            label="Live traffic"
            checked={options.trafficLayer}
            onChange={(next) => onOptionChange('trafficLayer', next)}
            hint="Google live traffic speeds"
          />
          <SwitchRow
            label="3D view"
            checked={options.threeD && !tiltUnavailable}
            disabled={tiltUnavailable}
            onChange={(next) => onOptionChange('threeD', next)}
            hint={
              tiltUnavailable
                ? 'Tilted view needs satellite or hybrid imagery'
                : 'Tilts to 45° aerial imagery'
            }
          />
          <SwitchRow
            label="Labels"
            checked={options.labels}
            onChange={(next) => onOptionChange('labels', next)}
            hint="Street and place names"
          />
          <SwitchRow
            label="Rain radar"
            checked={options.weather && radarAvailable}
            disabled={!radarAvailable}
            onChange={(next) => onOptionChange('weather', next)}
            hint={
              radarAvailable
                ? 'Precipitation radar, refreshed every 10 minutes'
                : 'Radar service unreachable'
            }
          />
          <SwitchRow
            label="GPU markers"
            checked={gpuMarkers}
            onChange={onGpuMarkersChange}
            hint="Draws detections on the graphics card instead of one DOM node each"
          />
        </div>

        <SectionTitle>System</SectionTitle>
        <div>
          <HealthRow label="API" value={health?.api ?? 'OFFLINE'} />
          <HealthRow label="Database" value={health?.database ?? 'OFFLINE'} />
          <HealthRow label="Telemetry ingest" value={health?.ingest ?? 'STOPPED'} />
          <div className="flex items-center justify-between gap-2 px-3 py-[5px]">
            <span className="text-mini text-faint">Dashboard sync</span>
            <span className="tnum font-mono text-mini text-dim" suppressHydrationWarning>
              {lastSync ? relativeTime(new Date(lastSync).toISOString(), now) : 'waiting'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-3 py-2 text-mini text-faint">
        <Activity className="h-3.5 w-3.5" aria-hidden />
        <span className="tnum">
          {health?.buses ?? 0} buses · {health?.events ?? 0} detections stored
        </span>
      </div>
    </FloatingPanel>
  );
}
