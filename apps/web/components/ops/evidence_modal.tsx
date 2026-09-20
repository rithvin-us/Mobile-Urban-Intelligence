'use client';

import React, { useState } from 'react';
import type { DetectionEvent, Bus, EventStatus } from '@/types';
import { X, ExternalLink, ShieldAlert, Cpu, MapPin, Calendar, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { eventTypeLabel, SEVERITY_LABELS, fullTimestamp } from '@/lib/format';

interface EvidenceModalProps {
  event: DetectionEvent;
  reportingBus?: Bus;
  onClose: () => void;
  onStatusChange?: (status: EventStatus) => void;
}

const LOCAL_SAMPLE_IMAGES: Record<string, string> = {
  POTHOLE: '/evidence/pothole_sample.jpg',
  WATERLOGGING: '/evidence/waterlogging_sample.jpg',
  ROAD_DAMAGE: '/evidence/road_damage_sample.jpg',
  TRAFFIC: '/evidence/traffic_sample.jpg',
  INCIDENT: '/evidence/incident_sample.jpg',
};

interface BoxStyle {
  border: string;
  bg: string;
  badge: string;
  label: string;
}

const BOX_STYLES: Record<string, BoxStyle> = {
  POTHOLE: {
    border: 'border-rose-500/90',
    bg: 'bg-rose-500/15',
    badge: 'bg-rose-600 text-white font-bold',
    label: 'POTHOLE HAZARD',
  },
  WATERLOGGING: {
    border: 'border-cyan-400/90',
    bg: 'bg-cyan-500/15',
    badge: 'bg-cyan-500 text-slate-950 font-bold',
    label: 'WATERLOGGING / FLOOD DETECTED',
  },
  ROAD_DAMAGE: {
    border: 'border-amber-400/90',
    bg: 'bg-amber-500/15',
    badge: 'bg-amber-500 text-slate-950 font-bold',
    label: 'ASPHALT CRACK / DAMAGE',
  },
  TRAFFIC: {
    border: 'border-orange-500/90',
    bg: 'bg-orange-500/15',
    badge: 'bg-orange-600 text-white font-bold',
    label: 'TRAFFIC CONGESTION',
  },
  INCIDENT: {
    border: 'border-purple-500/90',
    bg: 'bg-purple-500/15',
    badge: 'bg-purple-600 text-white font-bold',
    label: 'ROAD INCIDENT',
  },
};

const DEFAULT_BOX_STYLE: BoxStyle = {
  border: 'border-cyan-500/90',
  bg: 'bg-cyan-500/15',
  badge: 'bg-cyan-600 text-white font-bold',
  label: 'ROAD DEFECT',
};

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  event,
  reportingBus,
  onClose,
  onStatusChange,
}) => {
  const [imageError, setImageError] = useState(false);
  const busNumber = reportingBus?.bus_number ?? event.bus_id;
  const boxStyle = BOX_STYLES[event.event_type] || DEFAULT_BOX_STYLE;

  const getResolvedImageUrl = () => {
    if (event.evidence_url) {
      if (event.evidence_url.startsWith('data:image/')) {
        return event.evidence_url;
      }
      if (event.evidence_url.startsWith('/evidence/')) {
        return event.evidence_url;
      }
      // If it's the dead googleapis template link from old seed data, map to our real local sample
      if (event.evidence_url.includes('storage.googleapis.com')) {
        return LOCAL_SAMPLE_IMAGES[event.event_type] || '/evidence/default_sample.jpg';
      }
      return event.evidence_url;
    }
    return LOCAL_SAMPLE_IMAGES[event.event_type] || '/evidence/default_sample.jpg';
  };

  const imageSrc = getResolvedImageUrl();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Sleek Compact Popup Overlay */}
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Compact Popup Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Evidence Snapshot: {eventTypeLabel(event.event_type)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Evidence Content Viewport */}
        <div className="p-4 space-y-3">
          <div className="relative w-full h-56 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src={imageError ? (LOCAL_SAMPLE_IMAGES[event.event_type] || '/evidence/default_sample.jpg') : imageSrc}
              alt={`Evidence for ${event.event_type}`}
              className="w-full h-full object-cover"
              onError={() => {
                if (!imageError) setImageError(true);
              }}
            />
            {/* AI Bounding Box overlay over real photo when not pre-rendered in base64 */}
            {!imageSrc.startsWith('data:image/') && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className={`border-2 ${boxStyle.border} ${boxStyle.bg} p-3 rounded-lg shadow-xl flex flex-col items-center backdrop-blur-[1px]`}>
                  <span className={`text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded mb-1 ${boxStyle.badge}`}>
                    [{boxStyle.label}] {(event.confidence * 100).toFixed(0)}% CONFIDENCE
                  </span>
                  <span className="text-[10px] font-mono text-slate-200">
                    GPS: {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-slate-800">
              CAM-01 OPTICAL SNAPSHOT
            </div>
            <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-slate-800">
              AI VERIFIED
            </div>
          </div>

          {/* Metadata Overview Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400 uppercase">Detection Severity</span>
              <span className="font-bold text-amber-400">{SEVERITY_LABELS[event.severity]}</span>
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400 uppercase">AI Confidence</span>
              <span className="font-bold text-emerald-400">{(event.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Detailed Info List */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Cpu className="h-3.5 w-3.5 text-blue-400" />
                Reporting Vehicle
              </span>
              <span className="font-mono text-white font-medium">{busNumber}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                Timestamp
              </span>
              <span className="font-mono text-slate-200 text-[11px]">{fullTimestamp(event.timestamp)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                GPS Coordinates
              </span>
              <span className="font-mono text-emerald-400 text-[11px]">
                {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions with municipal officer workflow */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-1.5">
            {onStatusChange && (
              <>
                {event.status === 'NEW' && (
                  <button
                    onClick={() => onStatusChange('ACKNOWLEDGED')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    Acknowledge
                  </button>
                )}
                {event.status !== 'RESOLVED' && (
                  <button
                    onClick={() => onStatusChange('INVESTIGATING')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-xs font-semibold text-white transition shadow-sm"
                  >
                    <ShieldAlert className="h-3 w-3" />
                    <span>Dispatch Crew</span>
                  </button>
                )}
                {event.status !== 'RESOLVED' ? (
                  <button
                    onClick={() => onStatusChange('RESOLVED')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span>Resolve</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onStatusChange('NEW')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-400 transition"
                  >
                    Reopen Defect
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
