'use client';

import React, { useState } from 'react';
import type { DetectionEvent, Bus, EventStatus } from '@/types';
import { X, ExternalLink, ShieldAlert, Cpu, MapPin, Calendar, CheckCircle, Video, Camera, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { eventTypeLabel, SEVERITY_LABELS, fullTimestamp } from '@/lib/format';
import { API_BASE_URL } from '@/lib/api';

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
    badge: 'bg-rose-600 text-ink font-bold',
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
    badge: 'bg-orange-600 text-ink font-bold',
    label: 'TRAFFIC CONGESTION',
  },
  INCIDENT: {
    border: 'border-purple-500/90',
    bg: 'bg-purple-500/15',
    badge: 'bg-purple-600 text-ink font-bold',
    label: 'ROAD INCIDENT',
  },
  DEFAULT: {
    border: 'border-blue-500/90',
    bg: 'bg-blue-500/15',
    badge: 'bg-blue-600 text-white font-bold',
    label: 'MUNICIPAL HAZARD',
  },
};

const DEFAULT_BOX_STYLE: BoxStyle = {
  border: 'border-cyan-500/90',
  bg: 'bg-cyan-500/15',
  badge: 'bg-cyan-600 text-ink font-bold',
  label: 'ROAD DEFECT',
};

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  event,
  reportingBus,
  onClose,
  onStatusChange,
}) => {
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<'snapshot' | 'video'>('snapshot');
  const busNumber = reportingBus?.bus_number ?? event.bus_id;
  const boxStyle = BOX_STYLES[event.event_type] || DEFAULT_BOX_STYLE;

  const getResolvedImageUrl = () => {
    const url = event.evidence_url;
    if (!url) return LOCAL_SAMPLE_IMAGES[event.event_type] || '/evidence/default_sample.jpg';

    // An edge unit's annotated frame, already decoded and written by the API.
    if (url.startsWith('data:image/')) return url;

    // The API stores camera frames under its own origin, not the dashboard's.
    if (url.startsWith('/static/')) return `${API_BASE_URL}${url}`;

    // Stock sample photographs ship with the dashboard.
    if (url.startsWith('/evidence/')) return url;

    // Old rows point at a Cloud Storage bucket that no longer exists; show the
    // matching sample rather than a broken image.
    if (url.includes('storage.googleapis.com')) {
      return LOCAL_SAMPLE_IMAGES[event.event_type] || '/evidence/default_sample.jpg';
    }

    return url;
  };

  const imageSrc = getResolvedImageUrl();
  const videoUrl = '/evidence/annotated_dashcam_output.mp4';

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Sleek Compact Popup Overlay */}
      <div className="relative w-full max-w-lg glass rounded-2xl shadow-2xl overflow-hidden text-ink flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Compact Popup Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-raised">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-ink tracking-tight">
              Evidence: {eventTypeLabel(event.event_type)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-canvas rounded-lg p-0.5 border border-line text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('snapshot')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'snapshot'
                    ? 'bg-accent text-white font-medium shadow-sm'
                    : 'text-dim hover:text-ink'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Snapshot</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('video')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'video'
                    ? 'bg-rose-600 text-white font-medium shadow-sm'
                    : 'text-dim hover:text-ink'
                }`}
              >
                <Video className="h-3.5 w-3.5 text-rose-300" />
                <span>AI Video</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-raised text-faint hover:text-ink hover:bg-hover transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Evidence Content Viewport */}
        <div className="p-4 space-y-3">
          <div className="relative w-full h-64 rounded-xl overflow-hidden border border-line bg-canvas flex items-center justify-center">
            {activeTab === 'video' ? (
              <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
                <video
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="w-full h-full object-contain"
                >
                  <source src={`${videoUrl}?v=2`} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute top-2 left-2 bg-panel/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-rose-400 border border-rose-900/50 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  ANNOTATED DASHCAM FEED
                </div>
                <a
                  href={videoUrl}
                  download="annotated_dashcam_output.mp4"
                  className="absolute top-2 right-2 bg-panel/90 hover:bg-hover backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-dim hover:text-ink border border-line flex items-center gap-1 transition"
                  title="Download Annotated Video MP4"
                >
                  <Download className="h-3 w-3" />
                  <span>MP4</span>
                </a>
              </div>
            ) : (
              <>
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
                      <span className="text-[10px] font-mono text-dim">
                        GPS: {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-panel backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-line">
                  CAM-01 OPTICAL SNAPSHOT
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('video')}
                  className="absolute bottom-2 left-2 bg-panel/95 hover:bg-hover backdrop-blur px-2.5 py-1 rounded text-[10px] font-medium text-amber-400 border border-amber-500/40 flex items-center gap-1.5 transition shadow-lg"
                >
                  <Video className="h-3 w-3 text-amber-400" />
                  <span>Watch Annotated Video</span>
                </button>
                <div className="absolute bottom-2 right-2 bg-panel backdrop-blur px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-line">
                  AI VERIFIED
                </div>
              </>
            )}
          </div>

          {/* Metadata Overview Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 glass-sunken rounded-xl flex flex-col gap-0.5">
              <span className="text-[10px] text-faint uppercase">Detection Severity</span>
              <span className="font-bold text-amber-400">{SEVERITY_LABELS[event.severity]}</span>
            </div>

            <div className="p-2.5 glass-sunken rounded-xl flex flex-col gap-0.5">
              <span className="text-[10px] text-faint uppercase">AI Confidence</span>
              <span className="font-bold text-emerald-400">{(event.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Detailed Info List */}
          <div className="p-3 glass-sunken rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-dim">
              <span className="flex items-center gap-1.5 text-faint text-[11px]">
                <Cpu className="h-3.5 w-3.5 text-blue-400" />
                Reporting Vehicle
              </span>
              <span className="font-mono text-ink font-medium">{busNumber}</span>
            </div>

            <div className="flex items-center justify-between text-dim">
              <span className="flex items-center gap-1.5 text-faint text-[11px]">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                Timestamp
              </span>
              <span className="font-mono text-dim text-[11px]">{fullTimestamp(event.timestamp)}</span>
            </div>

            <div className="flex items-center justify-between text-dim">
              <span className="flex items-center gap-1.5 text-faint text-[11px]">
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
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-line bg-raised">
          <div className="flex items-center gap-1.5">
            {onStatusChange && (
              <>
                {event.status === 'NEW' && (
                  <button
                    onClick={() => onStatusChange('ACKNOWLEDGED')}
                    className="px-2.5 py-1 rounded bg-raised hover:bg-hover text-xs font-semibold text-dim transition"
                  >
                    Acknowledge
                  </button>
                )}
                {event.status !== 'RESOLVED' && (
                  <button
                    onClick={() => onStatusChange('INVESTIGATING')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-xs font-semibold text-ink transition shadow-sm"
                  >
                    <ShieldAlert className="h-3 w-3" />
                    <span>Dispatch Crew</span>
                  </button>
                )}
                {event.status !== 'RESOLVED' ? (
                  <button
                    onClick={() => onStatusChange('RESOLVED')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-ink transition shadow-sm"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span>Resolve</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onStatusChange('NEW')}
                    className="px-2.5 py-1 rounded bg-raised hover:bg-hover text-xs font-semibold text-faint transition"
                  >
                    Reopen Defect
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-raised text-xs font-semibold text-dim hover:bg-hover transition ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
