'use client';

import React from 'react';
import { Activity, ChevronLeft, Layers, PanelLeft, SlidersHorizontal } from 'lucide-react';

import type {
  LayerKey,
  LayerState,
  MapOptionsState,
  MapStyleKey,
  SystemHealth,
} from '@/types';
import { LAYER_COLORS, LAYER_LABELS, relativeTime } from '@/lib/format';
import { MAP_STYLE_LABELS } from '@/lib/map_styles';
import { Dot, SectionTitle, Segmented, SwitchRow } from '@/components/ops/primitives';
import { cn } from '@/lib/utils';

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
  collapsed: boolean;
  onToggleCollapsed: () => void;
  layers: LayerState;
  layerCounts: Record<LayerKey, number>;
  onLayerChange: (key: LayerKey, next: boolean) => void;
  mapStyle: MapStyleKey;
  onMapStyleChange: (next: MapStyleKey) => void;
  options: MapOptionsState;
  onOptionChange: (key: keyof MapOptionsState, next: boolean) => void;
  radarAvailable: boolean;
  health: SystemHealth | null;
  lastSync: number | null;
  now: number;
}

function healthTone(value: string | undefined): string {
  switch (value) {
    case 'ONLINE':
    case 'RUNNING':
      return '#4F9D77';
    case 'STALE':
      return '#C9922F';
    case 'OFFLINE':
    case 'STOPPED':
      return '#C7564C';
    default:
      return '#68798A';
  }
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-[5px]">
      <span className="text-[11px] text-faint">{label}</span>
      <span className="flex items-center gap-1.5">
        <Dot color={healthTone(value)} pulse={value === 'RUNNING'} />
        <span className="text-[11px] text-dim">{value.charAt(0) + value.slice(1).toLowerCase()}</span>
      </span>
    </div>
  );
}

export function LeftPanel({
  collapsed,
  onToggleCollapsed,
  layers,
  layerCounts,
  onLayerChange,
  mapStyle,
  onMapStyleChange,
  options,
  onOptionChange,
  radarAvailable,
  health,
  lastSync,
  now,
}: LeftPanelProps) {
  if (collapsed) {
    return (
      <div className="flex h-full w-11 flex-col items-center gap-3 border-r border-line bg-panel py-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Open control panel"
          title="Open control panel"
          className="p-1.5 text-dim transition-colors hover:text-ink"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <Layers className="h-4 w-4 text-faint" aria-hidden />
        <SlidersHorizontal className="h-4 w-4 text-faint" aria-hidden />
        <div className="mt-auto pb-1">
          <Dot color={healthTone(health?.ingest)} pulse={health?.ingest === 'RUNNING'} />
        </div>
      </div>
    );
  }

  const styleOptions = (Object.keys(MAP_STYLE_LABELS) as MapStyleKey[]).map((key) => ({
    value: key,
    label: MAP_STYLE_LABELS[key],
  }));

  const tiltUnavailable = mapStyle === 'streets';

  return (
    <div className="flex h-full w-[232px] flex-col border-r border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="flex items-center gap-2 text-ink">
          <Layers className="h-4 w-4 text-accent" aria-hidden />
          Controls
        </span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Collapse control panel"
          className="text-faint transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-3">
        <SectionTitle>Map layers</SectionTitle>
        <div className="border-y border-line-soft">
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
        <div className="border-y border-line-soft">
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
        </div>

        <SectionTitle>System</SectionTitle>
        <div className="border-y border-line-soft">
          <HealthRow label="API" value={health?.api ?? 'OFFLINE'} />
          <HealthRow label="Database" value={health?.database ?? 'OFFLINE'} />
          <HealthRow label="Telemetry ingest" value={health?.ingest ?? 'STOPPED'} />
          <div className="flex items-center justify-between gap-2 px-3 py-[5px]">
            <span className="text-[11px] text-faint">Dashboard sync</span>
            <span className="tnum font-mono text-[11px] text-dim" suppressHydrationWarning>
              {lastSync ? relativeTime(new Date(lastSync).toISOString(), now) : 'waiting'}
            </span>
          </div>
        </div>
      </div>

      <div className={cn('flex items-center gap-2 border-t border-line px-3 py-2 text-[11px] text-faint')}>
        <Activity className="h-3.5 w-3.5" aria-hidden />
        <span>
          {health?.buses ?? 0} buses · {health?.events ?? 0} detections stored
        </span>
      </div>
    </div>
  );
}
