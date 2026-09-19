'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bus, DetectionEvent } from '@/types';
import { BusModelViewer } from '@/components/3d/bus_model_viewer';
import { BusStreetView } from '@/components/dashboard/bus_street_view';
import { X, Navigation, Gauge, AlertTriangle, ExternalLink, Video, Box, Cpu, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BusTelemetryModalProps {
  bus: Bus | null;
  events: DetectionEvent[];
  onClose: () => void;
}

export const BusTelemetryModal: React.FC<BusTelemetryModalProps> = ({ bus, events, onClose }) => {
  const [viewMode, setViewMode] = useState<'3d' | 'camera' | 'street'>('3d');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const busId = bus?.bus_id || bus?.id;
  const busEvents = events.filter((e) => e.bus_id === busId);
  const latestDefect = busEvents.length > 0 ? busEvents[0] : null;

  // Simulated AI Dashcam Overlay Canvas Renderer
  useEffect(() => {
    if (!bus || viewMode !== 'camera') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frameCount = 0;

    const renderDashcamFeed = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;

      // 1. Render Simulated Road Highway Background
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#0f172a'); // Horizon sky
      gradient.addColorStop(0.4, '#1e293b');
      gradient.addColorStop(1, '#020617'); // Road surface
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Draw Perspective Lane Lines
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.moveTo(w / 2, h * 0.45);
      ctx.lineTo(w * 0.1, h);
      ctx.moveTo(w / 2, h * 0.45);
      ctx.lineTo(w * 0.9, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Horizon line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.45);
      ctx.lineTo(w, h * 0.45);
      ctx.stroke();

      // 2. Simulated Moving Defect Bounding Box
      const offset = (frameCount * 2) % (h * 0.55);
      const boxY = h * 0.45 + offset;
      const boxX = w * 0.38 + Math.sin(frameCount * 0.05) * 30;
      const boxW = 80 + (offset / (h * 0.55)) * 50;
      const boxH = 40 + (offset / (h * 0.55)) * 25;

      if (boxY < h - 20) {
        ctx.strokeStyle = '#ef4444'; // Red bounding box
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(boxX, boxY - 18, 130, 18);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`[POTHOLE] 94.8%`, boxX + 4, boxY - 5);
      }

      // 3. Camera HUD Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(8, 8, 160, 42);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 160, 42);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`CAM-01 FRONT AI`, 14, 22);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '9px monospace';
      ctx.fillText(`FPS: ${(32 + Math.sin(frameCount * 0.1) * 2).toFixed(1)} | Jetson`, 14, 38);

      // REC Dot Indicator
      ctx.fillStyle = (frameCount % 40 < 20) ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(w - 18, 18, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`LIVE`, w - 45, 21);

      animId = requestAnimationFrame(renderDashcamFeed);
    };

    renderDashcamFeed();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [bus, viewMode]);

  if (!bus) return null;

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

        {/* Viewport Area: Toggleable between 3D Model, Live AI Camera Feed, and Street View */}
        <div className="relative w-full h-[190px] bg-slate-950 border-b border-slate-800/80">
          
          {/* Top Left Toggle Pills */}
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur p-1 rounded-lg border border-slate-800 shadow-md">
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                viewMode === '3d'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Box className="h-3 w-3" />
              <span>3D Bus</span>
            </button>

            <button
              onClick={() => setViewMode('camera')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                viewMode === 'camera'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Video className="h-3 w-3" />
              <span>Live Feed</span>
            </button>

            <button
              onClick={() => setViewMode('street')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                viewMode === 'street'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <MapPin className="h-3 w-3" />
              <span>Street View</span>
            </button>
          </div>

          {/* Top Right Speed Indicator */}
          <div className="absolute top-2 right-2 z-20 bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 shadow-md">
            <Gauge className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-bold text-white">{bus.speed.toFixed(0)}</span>
            <span className="text-[10px] text-slate-400">km/h</span>
          </div>

          {/* Viewport Content */}
          {viewMode === '3d' ? (
            <BusModelViewer
              modelUrl="/bharat-bus-av.glb"
              busHeading={bus.heading}
              autoRotate={true}
              interactiveHotspots={false}
              className="w-full h-full"
            />
          ) : viewMode === 'camera' ? (
            <div className="w-full h-full relative overflow-hidden bg-slate-950">
              <canvas ref={canvasRef} width={420} height={190} className="w-full h-full object-cover" />
            </div>
          ) : (
            <BusStreetView
              latitude={bus.latitude}
              longitude={bus.longitude}
              heading={bus.heading}
              className="w-full h-full"
            />
          )}
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
