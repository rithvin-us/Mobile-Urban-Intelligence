'use client';

import React from 'react';
import Link from 'next/link';
import { Bus, DetectionEvent } from '@/types';
import { BusModelViewer } from '@/components/3d/bus_model_viewer';
import { X, Navigation, Gauge, AlertTriangle, ExternalLink, Activity, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BusTelemetryModalProps {
  bus: Bus | null;
  events: DetectionEvent[];
  onClose: () => void;
}

export const BusTelemetryModal: React.FC<BusTelemetryModalProps> = ({ bus, events, onClose }) => {
  if (!bus) return null;

  const busId = bus.bus_id || bus.id;
  const busEvents = events.filter((e) => e.bus_id === busId);
  const latestDefect = busEvents.length > 0 ? busEvents[0] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Small, Compact Popup Container */}
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Navigation className="h-4 w-4" style={{ transform: `rotate(${bus.heading}deg)` }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">{bus.bus_number}</h3>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                  {bus.status}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                {bus.route_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Compact 3D Bus Viewport */}
        <div className="relative w-full h-[190px] bg-slate-950 border-b border-slate-800/80">
          <BusModelViewer
            modelUrl="/bharat-bus-av.glb"
            busHeading={bus.heading}
            autoRotate={true}
            interactiveHotspots={false}
            className="w-full h-full"
          />
          {/* Live Speed Overlay Badge */}
          <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 shadow-md">
            <Gauge className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-bold text-white">{bus.speed.toFixed(0)}</span>
            <span className="text-[10px] text-slate-400">km/h</span>
          </div>
        </div>

        {/* Basic Overview Telemetry Grid */}
        <div className="p-4 space-y-3 bg-slate-900/90">
          
          {/* Key Metrics Row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Speed</span>
              <div className="text-xs font-bold text-blue-400 mt-0.5">{bus.speed.toFixed(1)} km/h</div>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Heading</span>
              <div className="text-xs font-bold text-amber-400 mt-0.5">{bus.heading.toFixed(0)}°</div>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Anomalies</span>
              <div className="text-xs font-bold text-emerald-400 mt-0.5">{busEvents.length} Detected</div>
            </div>
          </div>

          {/* Location Coordinates */}
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">Coordinates:</span>
            <span className="font-mono text-[11px] text-emerald-400 font-medium">
              {bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}
            </span>
          </div>

          {/* AI Edge Camera & Defect Status Overview */}
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[11px]">
              <Cpu className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-300">
                {latestDefect ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Latest: {latestDefect.event_type} ({latestDefect.severity})
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">AI Stream Active • Road Normal</span>
                )}
              </span>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

        </div>

        {/* Compact Footer Actions */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs">
          <Link
            href="/architecture"
            onClick={onClose}
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition"
          >
            <span>Full 3D Hardware Specs</span>
            <ExternalLink className="h-3 w-3" />
          </Link>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition text-[11px] font-medium"
          >
            Close Overview
          </button>
        </div>

      </div>
    </div>
  );
};
