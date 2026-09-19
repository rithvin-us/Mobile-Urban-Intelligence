import React from 'react';
import { Crosshair, Box } from 'lucide-react';

import type { Bus, DetectionEvent } from '@/types';
import {
  compass,
  coordinateLabel,
  eventTypeLabel,
  relativeTime,
  severityDot,
} from '@/lib/format';
import { FLEET_STATE_COLORS, FLEET_STATE_LABELS, fleetState } from '@/lib/fleet';
import { routeCorridor } from '@/lib/routes';
import { usePlaceName } from '@/lib/use_place_name';
import {
  ActionButton,
  DataRow,
  Dot,
  FloatingPanel,
  PanelHeader,
} from '@/components/ops/primitives';

interface BusCardProps {
  bus: Bus;
  events: DetectionEvent[];
  onClose: () => void;
  onCenter: () => void;
  onOpen3DView?: () => void;
  onSelectEvent: (eventId: string) => void;
  now: number;
}

export function BusCard({ bus, events, onClose, onCenter, onOpen3DView, onSelectEvent, now }: BusCardProps) {
  const state = fleetState(bus, now);
  const place = usePlaceName(bus.latitude, bus.longitude);
  const recent = events.slice(0, 3);

  return (
    <FloatingPanel>
      <PanelHeader
        accent={FLEET_STATE_COLORS[state]}
        title={bus.bus_number}
        subtitle={`Route ${bus.route_name} · ${routeCorridor(bus.route_name)}`}
        onClose={onClose}
      />

      <div className="border-b border-line-soft py-1">
        <DataRow label="Speed" value={`${bus.speed.toFixed(0)} km/h`} />
        <DataRow label="Heading" value={`${compass(bus.heading)} · ${bus.heading.toFixed(0)}°`} />
        <DataRow
          label="Status"
          value={
            <span className="inline-flex items-center gap-1.5">
              <Dot color={FLEET_STATE_COLORS[state]} pulse={state === 'ACTIVE'} />
              {FLEET_STATE_LABELS[state]}
            </span>
          }
          mono={false}
        />
        <DataRow label="Last telemetry" value={relativeTime(bus.last_seen, now)} />
        <DataRow label="Position" value={coordinateLabel(bus.latitude, bus.longitude)} />
        <DataRow label="Near" value={place} mono={false} />
      </div>

      <div className="px-3 py-2">
        <div className="pb-1 text-[11px] text-faint">
          Reported by this bus{events.length > 0 ? ` (${events.length})` : ''}
        </div>
        {recent.length === 0 ? (
          <p className="py-1 text-[11px] text-faint">No detections from this bus yet.</p>
        ) : (
          <div className="-mx-1">
            {recent.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className="flex w-full items-baseline gap-2 px-1 py-[3px] text-left transition-colors hover:bg-hover"
              >
                <Dot color={severityDot(event.severity)} className="translate-y-[-2px]" />
                <span className="min-w-0 flex-1 truncate text-[11px] text-dim">
                  {eventTypeLabel(event.event_type)}
                </span>
                <span className="tnum shrink-0 font-mono text-[10px] text-faint">
                  {relativeTime(event.timestamp, now)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line px-2 py-2">
        {onOpen3DView && (
          <ActionButton tone="primary" onClick={onOpen3DView}>
            <span className="flex items-center justify-center gap-1.5 font-semibold text-blue-400">
              <Box className="h-3.5 w-3.5" aria-hidden />
              Inspect 3D Twin & Sensors
            </span>
          </ActionButton>
        )}
        <ActionButton onClick={onCenter}>
          <span className="flex items-center justify-center gap-1.5">
            <Crosshair className="h-3 w-3" aria-hidden />
            Follow on map
          </span>
        </ActionButton>
      </div>
    </FloatingPanel>
  );
}

