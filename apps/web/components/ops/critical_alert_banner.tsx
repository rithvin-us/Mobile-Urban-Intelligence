'use client';

import React from 'react';
import { AlertOctagon, MapPin, X } from 'lucide-react';
import { DetectionEvent } from '@/types';
import { eventTypeLabel, relativeTime } from '@/lib/format';

interface CriticalAlertBannerProps {
  criticalEvent: DetectionEvent | null;
  now: number;
  onLocate: (event: DetectionEvent) => void;
  onDismiss: () => void;
}

export function CriticalAlertBanner({ criticalEvent, now, onLocate, onDismiss }: CriticalAlertBannerProps) {
  if (!criticalEvent) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border border-rose-500/50 bg-rose-950/70 text-xs text-rose-100 backdrop-blur-md shadow-xl animate-pulse">
      <div className="flex items-center gap-2">
        <AlertOctagon className="h-4 w-4 text-rose-400 shrink-0" />
        <div>
          <span className="font-bold text-white uppercase">{eventTypeLabel(criticalEvent.event_type)}</span>
          <span className="mx-1.5 opacity-60">•</span>
          <span>Bus {criticalEvent.bus_id}</span>
          <span className="mx-1.5 opacity-60">•</span>
          <span className="text-rose-300">{relativeTime(criticalEvent.timestamp, now)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onLocate(criticalEvent)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium transition"
        >
          <MapPin className="h-3 w-3" />
          <span>Locate</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-rose-300 hover:text-white transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
