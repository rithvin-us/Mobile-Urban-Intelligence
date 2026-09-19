'use client';

import React from 'react';
import { Bus as BusIcon, Maximize2, PanelLeft, PanelRight } from 'lucide-react';

import type { FleetCounts, SystemHealth } from '@/types';
import { CITY_NAME } from '@/lib/routes';
import { relativeTime } from '@/lib/format';
import { Dot } from '@/components/ops/primitives';

interface TopBarProps {
  fleet: FleetCounts;
  openDetections: number;
  criticalDetections: number;
  health: SystemHealth | null;
  lastSync: number | null;
  now: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onFullscreen: () => void;
}

function Counter({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="tnum font-mono text-[13px] text-ink" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
      <span className="text-[11px] text-faint">{label}</span>
    </div>
  );
}

export function TopBar({
  fleet,
  openDetections,
  criticalDetections,
  health,
  lastSync,
  now,
  leftCollapsed,
  rightCollapsed,
  onToggleLeft,
  onToggleRight,
  onFullscreen,
}: TopBarProps) {
  const ingestTone =
    health?.ingest === 'RUNNING' ? '#4F9D77' : health?.ingest === 'STALE' ? '#C9922F' : '#C7564C';

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-panel px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center border border-accent-line bg-accent-soft text-accent">
          <BusIcon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="truncate font-medium leading-tight text-ink">Urban Intelligence</div>
          <div className="truncate text-[10px] leading-tight text-faint">
            {CITY_NAME} transport operations · fleet road sensing
          </div>
        </div>
      </div>

      <div className="ml-2 hidden items-center gap-5 border-l border-line pl-5 md:flex">
        <Counter label="buses reporting" value={`${fleet.active + fleet.idle}/${fleet.total}`} />
        <Counter label="open detections" value={String(openDetections)} />
        <Counter
          label="critical"
          value={String(criticalDetections)}
          tone={criticalDetections > 0 ? '#C7564C' : undefined}
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <Dot color={ingestTone} pulse={health?.ingest === 'RUNNING'} />
          <span className="tnum font-mono text-[11px] text-dim">
            {lastSync ? relativeTime(new Date(lastSync).toISOString(), now) : 'connecting'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleLeft}
            aria-label={leftCollapsed ? 'Show controls' : 'Hide controls'}
            title={leftCollapsed ? 'Show controls' : 'Hide controls'}
            className="p-1.5 text-faint transition-colors hover:text-ink"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleRight}
            aria-label={rightCollapsed ? 'Show intelligence panel' : 'Hide intelligence panel'}
            title={rightCollapsed ? 'Show intelligence panel' : 'Hide intelligence panel'}
            className="p-1.5 text-faint transition-colors hover:text-ink"
          >
            <PanelRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onFullscreen}
            aria-label="Toggle fullscreen map"
            title="Toggle fullscreen map"
            className="p-1.5 text-faint transition-colors hover:text-ink"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
