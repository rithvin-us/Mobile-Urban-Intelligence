'use client';

import React from 'react';
import { AlertOctagon, Bus, CloudRain, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';

interface QuickFilterBarProps {
  criticalOnly: boolean;
  activeOnly: boolean;
  weatherOnly: boolean;
  onToggleCriticalOnly: () => void;
  onToggleActiveOnly: () => void;
  onToggleWeatherOnly: () => void;
  onResetFilters: () => void;
}

/** A filter chip: the icon colour is the layer's colour, so the eye can pick it out. */
function Chip({
  active,
  onClick,
  tone,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-mini font-medium transition-all',
        active
          ? 'border-transparent text-ink'
          : 'border-transparent text-dim hover:bg-hover/60 hover:text-ink'
      )}
      style={
        active
          ? { backgroundColor: `color-mix(in srgb, ${tone} 20%, transparent)`, borderColor: tone }
          : undefined
      }
    >
      <span style={{ color: tone }} className="flex">
        {icon}
      </span>
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

export function QuickFilterBar({
  criticalOnly,
  activeOnly,
  weatherOnly,
  onToggleCriticalOnly,
  onToggleActiveOnly,
  onToggleWeatherOnly,
  onResetFilters,
}: QuickFilterBarProps) {
  const anyOn = criticalOnly || activeOnly || weatherOnly;

  return (
    <div className="glass pointer-events-auto flex items-center gap-1 rounded-panel p-1">
      <Chip
        active={criticalOnly}
        onClick={onToggleCriticalOnly}
        tone="var(--crit)"
        icon={<AlertOctagon className="h-3.5 w-3.5" />}
      >
        Critical only
      </Chip>
      <Chip
        active={activeOnly}
        onClick={onToggleActiveOnly}
        tone="var(--accent)"
        icon={<Bus className="h-3.5 w-3.5" />}
      >
        Open cases
      </Chip>
      <Chip
        active={weatherOnly}
        onClick={onToggleWeatherOnly}
        tone="var(--water)"
        icon={<CloudRain className="h-3.5 w-3.5" />}
      >
        Rain radar
      </Chip>

      {anyOn && (
        <button
          type="button"
          onClick={onResetFilters}
          title="Clear quick filters"
          aria-label="Clear quick filters"
          className="ml-0.5 rounded-lg p-1.5 text-faint transition-colors hover:bg-hover/60 hover:text-ink"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
