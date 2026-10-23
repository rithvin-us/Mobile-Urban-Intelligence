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
  Video,
  Download,
  X,
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
  const [showDashcamModal, setShowDashcamModal] = useState(false);

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
    <>
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
          {/* Live AI Dashcam Annotated Video Feed Button */}
          <button
            type="button"
            onClick={() => setShowDashcamModal(true)}
            title="Watch Live Annotated AI Dashcam Video Feed"
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-mini font-medium text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <Video className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-mono uppercase tracking-wider text-micro font-semibold">
              AI Dashcam
            </span>
          </button>

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

      {/* Live AI Dashcam Video Modal */}
      {showDashcamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl glass rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-raised">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-sm font-bold text-ink tracking-tight">
                  Live AI Dashcam Perception Feed (BUS-005)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/evidence/annotated_dashcam_output.mp4"
                  download="annotated_dashcam_output.mp4"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-canvas hover:bg-hover text-xs font-mono text-dim hover:text-ink border border-line transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download MP4</span>
                </a>
                <button
                  onClick={() => setShowDashcamModal(false)}
                  className="p-1.5 rounded-lg bg-canvas text-faint hover:text-ink hover:bg-hover transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              <video
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
              >
                <source src="/evidence/annotated_dashcam_output.mp4?v=2" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="p-3 bg-raised border-t border-line flex items-center justify-between text-xs text-dim">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono text-[10px] border border-rose-500/30">
                  3 TRAINED HAZARD CLASSES
                </span>
                <span className="hidden sm:inline text-[11px] text-faint">
                  Potholes · Waterlogging · Road Damage — live YOLOv8 inference
                </span>
              </div>
              <span className="font-mono text-[11px] text-emerald-400">848x478 @ 24FPS</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
