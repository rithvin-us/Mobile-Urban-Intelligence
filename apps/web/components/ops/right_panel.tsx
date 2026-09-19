'use client';

import React from 'react';
import { ChevronRight, PanelRight } from 'lucide-react';

import type { Bus, DetectionEvent, EventSeverity, EventStatus, FleetCounts } from '@/types';
import {
  EVENT_COLORS,
  eventMetadata,
  eventTypeLabel,
  relativeTime,
  severityDot,
} from '@/lib/format';
import { FLEET_STATE_COLORS } from '@/lib/fleet';
import { usePlaceName } from '@/lib/use_place_name';
import { Dot, SectionTitle, Segmented } from '@/components/ops/primitives';
import { cn } from '@/lib/utils';

export type StatusFilter = 'ALL' | 'OPEN' | EventStatus;
export type SeverityFilter = 'ALL' | 'HIGH_UP';

interface RightPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
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

function FleetTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex-1 border-r border-line-soft px-2 py-[6px] last:border-r-0">
      <div className="flex items-center gap-1.5 text-[10px] text-faint">
        {color && <Dot color={color} />}
        {label}
      </div>
      <div className="tnum font-mono text-[16px] leading-tight text-ink">{value}</div>
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

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full gap-2 border-b border-line-soft px-3 py-2 text-left transition-colors',
        selected ? 'bg-accent-soft' : 'hover:bg-hover'
      )}
    >
      <span className="mt-[5px]">
        <Dot color={event.status === 'RESOLVED' ? '#4F9D77' : severityDot(event.severity)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-ink">{eventTypeLabel(event.event_type)}</span>
          <span className="tnum shrink-0 font-mono text-[10px] text-faint">
            {relativeTime(event.timestamp, now)}
          </span>
        </span>
        <span className="block truncate text-[11px] text-dim">{place}</span>
        <span className="tnum block truncate font-mono text-[10px] text-faint">
          {busNumber} · {(event.confidence * 100).toFixed(0)}%
          {event.status !== 'NEW' && ` · ${event.status.toLowerCase()}`}
        </span>
      </span>
    </button>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-r border-line-soft px-3 py-[5px] last:border-r-0 even:border-r-0">
      <div className="text-[10px] text-faint">{label}</div>
      <div className="tnum font-mono text-[12px] text-ink">{value}</div>
    </div>
  );
}

export function RightPanel({
  collapsed,
  onToggleCollapsed,
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
  if (collapsed) {
    return (
      <div className="flex h-full w-11 flex-col items-center gap-3 border-l border-line bg-panel py-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Open intelligence panel"
          title="Open intelligence panel"
          className="p-1.5 text-dim transition-colors hover:text-ink"
        >
          <PanelRight className="h-4 w-4" />
        </button>
        <span className="tnum font-mono text-[11px] text-accent">{fleet.active}</span>
        <span className="tnum font-mono text-[11px] text-warn">{stats.activeIncidents}</span>
      </div>
    );
  }

  const visible = events.slice(0, 40);

  return (
    <div className="flex h-full w-[302px] flex-col border-l border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-ink">City intelligence</span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Collapse intelligence panel"
          className="text-faint transition-colors hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <SectionTitle>Fleet</SectionTitle>
        <div className="flex border-y border-line-soft">
          <FleetTile label="Active" value={fleet.active} color={FLEET_STATE_COLORS.ACTIVE} />
          <FleetTile label="Idle" value={fleet.idle} color={FLEET_STATE_COLORS.IDLE} />
          <FleetTile label="Offline" value={fleet.offline} color={FLEET_STATE_COLORS.OFFLINE} />
          <FleetTile label="Total" value={fleet.total} />
        </div>

        <SectionTitle
          right={<span className="tnum font-mono text-[10px] text-faint">{events.length} shown</span>}
        >
          Recent detections
        </SectionTitle>

        <div className="flex gap-1 px-3 pb-2">
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

        <div className="min-h-[176px] flex-1 overflow-y-auto border-t border-line-soft">
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-[11px] text-faint">
              No detections match these filters. Widen the filter or switch layers back on.
            </p>
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
        <div className="grid grid-cols-2 border-t border-line-soft">
          <StatCell label="Detections" value={String(stats.totalEvents)} />
          <StatCell label="Road defects" value={String(stats.roadDefects)} />
          <StatCell label="Open incidents" value={String(stats.activeIncidents)} />
          <StatCell label="Buses reporting" value={String(stats.activeBuses)} />
          <StatCell
            label="Avg response"
            value={
              stats.avgResponseMinutes === null
                ? 'no closures yet'
                : `${stats.avgResponseMinutes.toFixed(1)} min`
            }
          />
          <StatCell
            label="Unresolved"
            value={String(events.filter((event) => event.status !== 'RESOLVED').length)}
          />
        </div>
      </div>

      <div className="border-t border-line px-3 py-2 text-[10px] text-faint">
        <span className="flex items-center gap-1.5">
          <Dot color={EVENT_COLORS.POTHOLE} />
          <span>Marker colour shows detection class; size shows severity.</span>
        </span>
      </div>
    </div>
  );
}
