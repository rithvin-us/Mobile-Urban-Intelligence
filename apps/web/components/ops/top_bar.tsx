'use client';

import React, { useState, useEffect } from 'react';
import { Bus as BusIcon, Maximize2, PanelLeft, PanelRight, Clock, Sun, Moon } from 'lucide-react';

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
  themeMode?: 'dark' | 'light';
  onToggleTheme?: () => void;
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
  themeMode = 'dark',
  onToggleTheme,
  onToggleLeft,
  onToggleRight,
  onFullscreen,
}: TopBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ingestTone =
    health?.ingest === 'RUNNING' ? '#4F9D77' : health?.ingest === 'STALE' ? '#C9922F' : '#C7564C';

  const formattedTime = mounted
    ? new Date(now).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  const formattedDate = mounted
    ? new Date(now).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

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
        {/* Live Operational Clock */}
        <div className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1 font-mono text-[11px] text-ink bg-canvas/40">
          <Clock className="h-3.5 w-3.5 text-accent" aria-hidden />
          <span className="font-semibold tracking-wider" suppressHydrationWarning>
            {formattedTime}
          </span>
          {mounted && formattedDate ? (
            <span className="text-[10px] text-faint hidden lg:inline" suppressHydrationWarning>
              | {formattedDate}
            </span>
          ) : null}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Dot color={ingestTone} pulse={health?.ingest === 'RUNNING'} />
          <span className="tnum font-mono text-[11px] text-dim" suppressHydrationWarning>
            {mounted && lastSync ? relativeTime(new Date(lastSync).toISOString(), now) : 'connecting'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Theme Mode Toggle Button with Shortcut Hint */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} theme (Key: T)`}
            title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} theme (Press 'T')`}
            className="flex items-center gap-1 rounded border border-line bg-raised px-2 py-1 text-xs text-ink transition-colors hover:bg-hover hover:border-accent-line"
          >
            {themeMode === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-blue-600" />
            )}
            <span className="hidden font-mono text-[10px] uppercase font-semibold text-faint sm:inline">
              [T]
            </span>
          </button>

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
