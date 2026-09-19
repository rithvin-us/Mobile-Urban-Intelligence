'use client';

import React from 'react';
import { AlertOctagon, Bus, CloudRain, RotateCcw } from 'lucide-react';

interface QuickFilterBarProps {
  criticalOnly: boolean;
  activeOnly: boolean;
  weatherOnly: boolean;
  onToggleCriticalOnly: () => void;
  onToggleActiveOnly: () => void;
  onToggleWeatherOnly: () => void;
  onResetFilters: () => void;
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
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl border border-line/80 bg-panel/75 backdrop-blur-md shadow-lg">
      <button
        type="button"
        onClick={onToggleCriticalOnly}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition ${
          criticalOnly
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
            : 'text-faint hover:text-ink hover:bg-hover'
        }`}
      >
        <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
        <span>Critical Defects</span>
      </button>

      <button
        type="button"
        onClick={onToggleActiveOnly}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition ${
          activeOnly
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
            : 'text-faint hover:text-ink hover:bg-hover'
        }`}
      >
        <Bus className="h-3.5 w-3.5 text-blue-400" />
        <span>Active Fleet Only</span>
      </button>

      <button
        type="button"
        onClick={onToggleWeatherOnly}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition ${
          weatherOnly
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
            : 'text-faint hover:text-ink hover:bg-hover'
        }`}
      >
        <CloudRain className="h-3.5 w-3.5 text-cyan-400" />
        <span>Rain & Radar</span>
      </button>

      {(criticalOnly || activeOnly || weatherOnly) && (
        <button
          type="button"
          onClick={onResetFilters}
          title="Reset quick filters"
          className="p-1 text-faint hover:text-ink transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
