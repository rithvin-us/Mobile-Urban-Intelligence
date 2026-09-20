'use client';

import React, { useEffect, useState } from 'react';
import {
  Bus as BusIcon,
  Maximize2,
  Moon,
  PanelLeft,
  PanelRight,
  PlayCircle,
  Sun,
} from 'lucide-react';

import type { FleetCounts, SystemHealth } from '@/types';
import { CITY_NAME } from '@/lib/routes';
import { relativeTime } from '@/lib/format';
import { Dot, IconButton } from '@/components/ops/primitives';
import { ViewMenu } from '@/components/ops/view_menu';
import type { ChromeState } from '@/lib/view_prefs';
import { cn } from '@/lib/utils';

interface TopBarProps {
  fleet: FleetCounts;
  openDetections: number;
  criticalDetections: number;
  health: SystemHealth | null;
  lastSync: number | null;
  now: number;
  chrome: ChromeState;
  onToggleChrome: (key: keyof ChromeState) => void;
  onClearChrome: () => void;
  onRestoreChrome: () => void;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  onFullscreen: () => void;
  demoMode: boolean;
  onToggleDemo: () => void;
  sourceLabel: string;
}

/** A counter reads as one unit: the number leads, the noun follows quietly. */
function Counter({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="tnum font-mono text-md font-medium text-ink"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </span>
      <span className="text-mini text-faint">{label}</span>
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
  chrome,
  onToggleChrome,
  onClearChrome,
  onRestoreChrome,
  themeMode,
  onToggleTheme,
  onFullscreen,
  demoMode,
  onToggleDemo,
  sourceLabel,
}: TopBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ingestTone =
    health?.ingest === 'RUNNING'
      ? 'var(--ok)'
      : health?.ingest === 'STALE'
      ? 'var(--warn)'
      : 'var(--crit)';

  const clock = mounted
    ? new Date(now).toLocaleTimeString('en-GB', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  const date = mounted
    ? new Date(now).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <header className="glass pointer-events-auto flex h-12 items-center gap-4 rounded-panel px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent-line bg-accent-soft text-accent">
          <BusIcon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight text-ink">Urban Intelligence</div>
          <div className="truncate text-micro leading-tight text-faint">
            {CITY_NAME} transport operations
          </div>
        </div>
      </div>

      <div className="ml-1 hidden items-center gap-5 border-l border-line pl-4 md:flex">
        <Counter label="buses reporting" value={`${fleet.active + fleet.idle}/${fleet.total}`} />
        <Counter label="open detections" value={String(openDetections)} />
        <Counter
          label="critical"
          value={String(criticalDetections)}
          tone={criticalDetections > 0 ? 'var(--crit)' : undefined}
        />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleDemo}
          aria-pressed={demoMode}
          title={
            demoMode
              ? 'Playing the scripted fleet. Switch back to the live API.'
              : 'Play the scripted fleet with no backend (D)'
          }
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-mini transition-colors',
            demoMode
              ? 'border-accent-line bg-accent-soft text-ink'
              : 'border-line-soft bg-raised text-dim hover:text-ink'
          )}
        >
          <PlayCircle className={cn('h-3.5 w-3.5', demoMode && 'text-accent')} />
          <span className="hidden sm:inline">{demoMode ? 'Demo' : 'Live'}</span>
        </button>

        <div className="hidden items-center gap-2 lg:flex">
          <Dot color={ingestTone} pulse={health?.ingest === 'RUNNING'} />
          <span className="tnum font-mono text-mini text-dim" suppressHydrationWarning>
            {sourceLabel}
            {lastSync && mounted ? ` · ${relativeTime(new Date(lastSync).toISOString(), now)}` : ''}
          </span>
        </div>

        <div className="hidden items-center gap-1.5 rounded-lg border border-line-soft bg-raised px-2 py-1 font-mono text-mini text-ink sm:flex">
          <span className="tnum font-semibold tracking-wide" suppressHydrationWarning>
            {clock}
          </span>
          {mounted && date ? (
            <span className="hidden text-micro text-faint xl:inline" suppressHydrationWarning>
              {date}
            </span>
          ) : null}
        </div>

        <ViewMenu
          chrome={chrome}
          onToggle={onToggleChrome}
          onClearAll={onClearChrome}
          onRestoreAll={onRestoreChrome}
        />

        <div className="flex items-center gap-1">
          <IconButton
            label={`Switch to ${themeMode === 'dark' ? 'daylight' : 'night'} theme (T)`}
            onClick={onToggleTheme}
          >
            {themeMode === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </IconButton>
          <IconButton
            label={chrome.controls ? 'Hide controls panel' : 'Show controls panel'}
            active={chrome.controls}
            onClick={() => onToggleChrome('controls')}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={chrome.intelligence ? 'Hide intelligence panel' : 'Show intelligence panel'}
            active={chrome.intelligence}
            onClick={() => onToggleChrome('intelligence')}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Toggle fullscreen map" onClick={onFullscreen}>
            <Maximize2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
