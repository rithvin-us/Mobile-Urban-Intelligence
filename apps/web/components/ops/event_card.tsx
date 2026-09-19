'use client';

import React from 'react';
import { Crosshair, ExternalLink } from 'lucide-react';

import type { Bus, DetectionEvent, EventCluster, EventStatus } from '@/types';
import {
  EVENT_COLORS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  eventMetadata,
  eventTypeLabel,
  fullTimestamp,
  relativeTime,
  severityTone,
  statusTone,
} from '@/lib/format';
import { usePlaceName } from '@/lib/use_place_name';
import {
  ActionButton,
  DataRow,
  FloatingPanel,
  PanelHeader,
} from '@/components/ops/primitives';

interface EventCardProps {
  event: DetectionEvent;
  reportingBus?: Bus;
  cluster?: EventCluster;
  pending: boolean;
  onClose: () => void;
  onCenter: () => void;
  onStatusChange: (status: EventStatus) => void;
  onSelectBus: (busId: string) => void;
  now: number;
}

export function EventCard({
  event,
  reportingBus,
  cluster,
  pending,
  onClose,
  onCenter,
  onStatusChange,
  onSelectBus,
  now,
}: EventCardProps) {
  const place = usePlaceName(event.latitude, event.longitude);
  const meta = eventMetadata(event);
  const busNumber = reportingBus?.bus_number ?? meta.bus_number ?? event.bus_id;
  const sightings = cluster?.sightings ?? 1;
  const observers = cluster?.busIds.length ?? 1;
  const resolved = event.status === 'RESOLVED';

  return (
    <FloatingPanel>
      <PanelHeader
        accent={EVENT_COLORS[event.event_type]}
        title={eventTypeLabel(event.event_type)}
        subtitle={place}
        onClose={onClose}
      />

      <div className="border-b border-line-soft py-1">
        <DataRow label="Confidence" value={`${(event.confidence * 100).toFixed(0)}%`} />
        <DataRow
          label="Severity"
          value={SEVERITY_LABELS[event.severity]}
          tone={severityTone(event.severity)}
          mono={false}
        />
        <DataRow
          label="Reported by"
          value={
            <button
              type="button"
              onClick={() => onSelectBus(event.bus_id)}
              className="text-accent underline-offset-2 hover:underline"
            >
              {busNumber}
            </button>
          }
          mono={false}
        />
        <DataRow label="First seen" value={fullTimestamp(cluster?.firstSeen ?? event.timestamp)} />
        <DataRow label="Last seen" value={relativeTime(cluster?.lastSeen ?? event.timestamp, now)} />
        <DataRow
          label="Observed by"
          value={
            observers > 1
              ? `${observers} buses · ${sightings} passes`
              : `1 bus · ${sightings} ${sightings === 1 ? 'pass' : 'passes'}`
          }
          mono={false}
        />
        <DataRow
          label="Status"
          value={STATUS_LABELS[event.status] ?? event.status}
          tone={statusTone(event.status)}
          mono={false}
        />
      </div>

      <div className="grid grid-cols-2 gap-1 px-2 py-2">
        <ActionButton tone="primary" onClick={onCenter}>
          <span className="flex items-center justify-center gap-1.5">
            <Crosshair className="h-3 w-3" aria-hidden />
            View on map
          </span>
        </ActionButton>
        {event.evidence_url ? (
          <a
            href={event.evidence_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 border border-line bg-raised px-2 py-[6px] text-[11px] text-dim transition-colors hover:border-[#2B3947] hover:text-ink"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Open evidence
          </a>
        ) : (
          <ActionButton disabled title="No camera frame stored for this detection">
            No evidence
          </ActionButton>
        )}
        <ActionButton
          onClick={() => onStatusChange('ACKNOWLEDGED')}
          disabled={pending || event.status !== 'NEW'}
          title={event.status === 'NEW' ? 'Mark as seen by the control room' : 'Already acknowledged'}
        >
          Acknowledge
        </ActionButton>
        <ActionButton
          onClick={() => onStatusChange('INVESTIGATING')}
          disabled={pending || event.status === 'INVESTIGATING' || resolved}
        >
          Investigate
        </ActionButton>
        <ActionButton
          tone="ok"
          onClick={() => onStatusChange('RESOLVED')}
          disabled={pending || resolved}
        >
          Resolve
        </ActionButton>
        <ActionButton
          onClick={() => onStatusChange('NEW')}
          disabled={pending || event.status === 'NEW'}
          title="Send the event back to the new queue"
        >
          Reopen
        </ActionButton>
      </div>
    </FloatingPanel>
  );
}
