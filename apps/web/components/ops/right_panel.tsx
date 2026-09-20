'use client';

import React from 'react';
import { Download } from 'lucide-react';

import { exportDefectsToCSV } from '@/lib/export_reports';
import type { Bus, DetectionEvent, EventStatus, FleetCounts } from '@/types';
import {
  eventMetadata,
  eventTypeLabel,
  relativeTime,
  severityDot,
} from '@/lib/format';
import { FLEET_STATE_COLORS } from '@/lib/fleet';
import { usePlaceName } from '@/lib/use_place_name';
import {
  Dot,
  FloatingPanel,
  PanelHeader,
  SectionTitle,
  Segmented,
} from '@/components/ops/primitives';
import { cn } from '@/lib/utils';

export type StatusFilter = 'ALL' | 'OPEN' | EventStatus;
export type SeverityFilter = 'ALL' | 'HIGH_UP';

interface RightPanelProps {
  onClose: () => void;
  fleet: FleetCounts;
  events: DetectionEvent[];
  busById: Map<string, Bus>;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (next: StatusFilter) => void;
  severityFilter: SeverityFilter;
  onSeverityFilterChange: (next: SeverityFilter) => void;
  stats: {
    totalEvents: number;
    roadDefects: number;
    activeIncidents: number;
    avgResponseMinutes: number | null;
    activeBuses: number;
  };
  now: number;
}

function FleetTile({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex-1 rounded-lg bg-raised px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-micro text-faint">
        {color && <Dot color={color} />}
        {label}
      </div>
      <div className="tnum font-mono text-lg leading-tight text-ink">{value}</div>
    </div>
  );
}

function EventRow({
  event,
  bus,
  selected,
  onSelect,
  geocode,
  now,
}: {
  event: DetectionEvent;
  bus?: Bus;
  selected: boolean;
  onSelect: () => void;
  geocode: boolean;
  now: number;
}) {
  const place = usePlaceName(event.latitude, event.longitude, geocode);
  const meta = eventMetadata(event);
  const busNumber = bus?.bus_number ?? meta.bus_number ?? event.bus_id;
  const namedPlace = meta.location_name ?? place;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full gap-2 border-l-2 px-3 py-2 text-left transition-colors',
        selected
          ? 'border-l-[color:var(--accent)] bg-accent-soft'
          : 'border-l-transparent hover:bg-hover/50'
      )}
    >
      <span className="mt-[6px]">
        <Dot color={event.status === 'RESOLVED' ? 'var(--ok)' : severityDot(event.severity)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-ink">{eventTypeLabel(event.event_type)}</span>
          <span className="tnum shrink-0 font-mono text-micro text-faint">
            {relativeTime(event.timestamp, now)}
          </span>
        </span>
        <span className="block truncate text-mini text-dim">{namedPlace}</span>
        <span className="tnum block truncate font-mono text-micro text-faint">
          {busNumber} · {(event.confidence * 100).toFixed(0)}%
          {event.status !== 'NEW' && ` · ${event.status.toLowerCase()}`}
        </span>
      </span>
    </button>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-raised px-2.5 py-1.5">
      <div className="text-micro text-faint">{label}</div>
      <div className="tnum truncate font-mono text-sm text-ink">{value}</div>
    </div>
  );
}

export function RightPanel({
  onClose,
  fleet,
  events,
  busById,
  selectedEventId,
  onSelectEvent,
  statusFilter,
  onStatusFilterChange,
  severityFilter,
  onSeverityFilterChange,
  stats,
  now,
}: RightPanelProps) {
  const visible = events.slice(0, 40);

  return (
    <FloatingPanel className="flex max-h-full w-[306px] flex-col">
      <PanelHeader
        title="City intelligence"
        onClose={onClose}
        actions={
          <button
            type="button"
            onClick={() => exportDefectsToCSV(events)}
            aria-label="Download the defect list as CSV"
            title="Download the defect list as CSV"
            className="flex items-center gap-1 rounded-lg border border-line-soft bg-raised px-2 py-1 text-mini text-dim transition-colors hover:text-ink"
          >
            <Download className="h-3 w-3 text-accent" />
            <span>CSV</span>
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <SectionTitle>Fleet</SectionTitle>
        <div className="flex gap-1.5 px-3">
          <FleetTile label="Active" value={fleet.active} color={FLEET_STATE_COLORS.ACTIVE} />
          <FleetTile label="Idle" value={fleet.idle} color={FLEET_STATE_COLORS.IDLE} />
          <FleetTile label="Offline" value={fleet.offline} color={FLEET_STATE_COLORS.OFFLINE} />
          <FleetTile label="Total" value={fleet.total} />
        </div>

        <SectionTitle
          right={
            <span className="tnum font-mono text-micro text-faint">{events.length} shown</span>
          }
        >
          Recent detections
        </SectionTitle>

        <div className="flex gap-1.5 px-3 pb-2">
          <Segmented
            className="flex-1"
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={[
              { value: 'ALL', label: 'All' },
              { value: 'OPEN', label: 'Open' },
              { value: 'ACKNOWLEDGED', label: 'Ack' },
              { value: 'RESOLVED', label: 'Closed' },
            ]}
          />
          <Segmented
            value={severityFilter}
            onChange={onSeverityFilterChange}
            options={[
              { value: 'ALL', label: 'Any' },
              { value: 'HIGH_UP', label: 'High+' },
            ]}
          />
        </div>

        <div className="min-h-[160px] flex-1 overflow-y-auto border-y border-line-soft">
          {visible.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-mini text-dim">Nothing matches these filters.</p>
              <p className="mt-1 text-micro text-faint">
                Widen the severity or status filter, or switch the layer back on in Controls.
              </p>
            </div>
          ) : (
            visible.map((event, index) => (
              <EventRow
                key={event.id}
                event={event}
                bus={busById.get(event.bus_id)}
                selected={event.id === selectedEventId}
                onSelect={() => onSelectEvent(event.id)}
                geocode={index < 6}
                now={now}
              />
            ))
          )}
        </div>

        <SectionTitle>Today</SectionTitle>
        <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
          <StatCell label="Detections" value={String(stats.totalEvents)} />
          <StatCell label="Road defects" value={String(stats.roadDefects)} />
          <StatCell label="Open incidents" value={String(stats.activeIncidents)} />
          <StatCell label="Buses reporting" value={String(stats.activeBuses)} />
          <StatCell
            label="Avg response"
            value={
              stats.avgResponseMinutes === null
                ? 'none closed yet'
                : `${stats.avgResponseMinutes.toFixed(1)} min`
            }
          />
          <StatCell
            label="Unresolved"
            value={String(events.filter((event) => event.status !== 'RESOLVED').length)}
          />
        </div>
      </div>
    </FloatingPanel>
  );
}
