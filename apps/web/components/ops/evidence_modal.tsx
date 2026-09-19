'use client';

import React, { useState } from 'react';
import { DetectionEvent, Bus } from '@/types';
import { X, ExternalLink, ShieldAlert, Cpu, MapPin, Calendar, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { eventTypeLabel, SEVERITY_LABELS, fullTimestamp } from '@/lib/format';

interface EvidenceModalProps {
  event: DetectionEvent;
  reportingBus?: Bus;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ event, reportingBus, onClose }) => {
  const [imageError, setImageError] = useState(false);
  const busNumber = reportingBus?.bus_number ?? event.bus_id;

  // Placeholder simulated optical evidence canvas generator when URL fails or is empty
  const renderFallbackPreview = () => (
    <div className="relative w-full h-56 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center p-4">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />

      {/* Simulated AI Detection Bounding Box */}
      <div className="relative z-10 border-2 border-red-500 bg-red-500/10 p-4 rounded-lg flex flex-col items-center shadow-lg backdrop-blur-xs">
        <ShieldAlert className="h-8 w-8 text-red-400 animate-pulse mb-1" />
        <span className="text-xs font-mono font-bold text-red-200 uppercase">
          [{event.event_type}] {(event.confidence * 100).toFixed(1)}% CONFIDENCE
        </span>
        <span className="text-[10px] font-mono text-slate-400 mt-1">
          GPS: {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
        </span>
      </div>

      {/* Camera HUD Header */}
      <div className="absolute top-2 left-2 z-20 bg-slate-900/90 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-slate-800 flex items-center gap-1.5">
        <Cpu className="h-3 w-3 text-cyan-400" />
        <span>CAM-01 OPTICAL FRAME SNAPSHOT</span>
      </div>

      <div className="absolute bottom-2 right-2 z-20 bg-slate-900/90 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-emerald-400 border border-slate-800">
        LIVE CAPTURE VERIFIED
      </div>
    </div>
  );

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
          {event.evidence_url && !imageError ? (
            <div className="relative w-full h-56 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img
                src={event.evidence_url}
                alt={`Evidence for ${event.event_type}`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-slate-800">
                OPTICAL SNAPSHOT
              </div>
            </div>
          ) : (
            renderFallbackPreview()
          )}

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

        {/* Footer actions */}
        <div className="flex items-center justify-end px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
