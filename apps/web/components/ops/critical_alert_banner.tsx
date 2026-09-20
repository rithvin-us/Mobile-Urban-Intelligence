'use client';

import React from 'react';
import { AlertOctagon, MapPin, X } from 'lucide-react';

import type { Bus, DetectionEvent } from '@/types';
import { eventMetadata, eventTypeLabel, relativeTime } from '@/lib/format';

interface CriticalAlertBannerProps {
  criticalEvent: DetectionEvent | null;
  reportingBus?: Bus;
  now: number;
  onLocate: (event: DetectionEvent) => void;
  onDismiss: () => void;
}

/**
 * The one loud thing on screen.
 *
 * It animates once, on arrival, and then holds still — a banner that pulses
 * forever stops meaning "new" and starts meaning "ignore me".
 */
export function CriticalAlertBanner({
  criticalEvent,
  reportingBus,
  now,
  onLocate,
  onDismiss,
}: CriticalAlertBannerProps) {
  if (!criticalEvent) return null;

  const meta = eventMetadata(criticalEvent);
  const busLabel = reportingBus?.bus_number ?? meta.bus_number ?? criticalEvent.bus_id;
  const place = meta.location_name;

  return (
    <div
      role="status"
      key={criticalEvent.id}
      className="glass alert-enter pointer-events-auto flex items-center gap-3 rounded-panel px-3 py-2"
      style={{
        borderColor: 'color-mix(in srgb, var(--crit) 55%, transparent)',
        boxShadow:
          '0 18px 44px -20px rgba(0,0,0,0.85), inset 0 0 0 1px color-mix(in srgb, var(--crit) 22%, transparent)',
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: 'color-mix(in srgb, var(--crit) 20%, transparent)' }}
      >
        <AlertOctagon className="h-4 w-4" style={{ color: 'var(--crit)' }} />
      </span>

      <div className="min-w-0">
        <div className="truncate font-semibold text-ink">
          {eventTypeLabel(criticalEvent.event_type)}
          {place ? <span className="font-normal text-dim"> at {place}</span> : null}
        </div>
        <div className="tnum truncate font-mono text-micro text-faint">
          {busLabel} · {(criticalEvent.confidence * 100).toFixed(0)}% ·{' '}
          {relativeTime(criticalEvent.timestamp, now)}
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onLocate(criticalEvent)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-mini font-semibold text-ink transition-all hover:brightness-110"
          style={{ backgroundColor: 'color-mix(in srgb, var(--crit) 82%, transparent)' }}
        >
          <MapPin className="h-3 w-3" />
          Show on map
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss this alert"
          className="rounded-lg p-1.5 text-faint transition-colors hover:bg-hover/60 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
