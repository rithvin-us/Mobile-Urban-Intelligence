'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, mapsApiKey } from '@/lib/maps_loader';
import { MapPin, RefreshCw, AlertTriangle, Video, Box, Compass } from 'lucide-react';

interface BusStreetViewProps {
  latitude: number;
  longitude: number;
  heading?: number;
  className?: string;
  onSwitchMode?: (mode: '3d' | 'camera') => void;
}

export const BusStreetView: React.FC<BusStreetViewProps> = ({
  latitude,
  longitude,
  heading = 0,
  className = 'w-full h-full',
  onSwitchMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noCoverage, setNoCoverage] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Listen for global Google Maps authentication failures
    const originalAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      if (!cancelled) {
        setAuthError(true);
        setLoading(false);
      }
      if (typeof originalAuthFailure === 'function') {
        originalAuthFailure();
      }
    };

    // Observer to detect if Google Maps injects error dialogs into the container
    let observer: MutationObserver | null = null;
    if (containerRef.current) {
      observer = new MutationObserver(() => {
        if (!containerRef.current || cancelled) return;
        const text = containerRef.current.innerText || '';
        const hasGoogleAlert =
          text.includes("can't load Google Maps correctly") ||
          text.includes('Do you own this website') ||
          containerRef.current.querySelector('.gm-err-container') !== null ||
          containerRef.current.querySelector('.gm-err-message') !== null;

        if (hasGoogleAlert) {
          setAuthError(true);
          setLoading(false);
        }
      });

      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    if (!containerRef.current) return;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const busPos = { lat: latitude, lng: longitude };

        // Check Street View Service Availability nearby (radius: 150 meters)
        const svService = new maps.StreetViewService();
        svService.getPanorama({ location: busPos, radius: 150 }, (data, status) => {
          if (cancelled) return;

          if (status === maps.StreetViewStatus.OK && data && data.location) {
            setNoCoverage(false);
            try {
              const panorama = new maps.StreetViewPanorama(containerRef.current!, {
                position: data.location.latLng || busPos,
                pov: { heading: heading, pitch: 0 },
                zoom: 1,
                disableDefaultUI: true,
                showRoadLabels: true,
                clickToGo: true,
              });

              panorama.addListener('status_changed', () => {
                if (cancelled) return;
                const pStatus = panorama.getStatus();
                if (pStatus !== maps.StreetViewStatus.OK) {
                  setNoCoverage(true);
                  setLoading(false);
                }
              });

              panoramaRef.current = panorama;
              setLoading(false);
            } catch (err: any) {
              setAuthError(true);
              setLoading(false);
            }
          } else {
            setNoCoverage(true);
            setLoading(false);
          }
        });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load Google Street View.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      (window as any).gm_authFailure = originalAuthFailure;
    };
  }, [latitude, longitude, heading]);

  const showFallback = authError || noCoverage || error !== null;

  return (
    <div className={`relative overflow-hidden bg-slate-950 ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <RefreshCw className="h-5 w-5 text-blue-400 animate-spin mb-2" />
          <p className="text-[11px] font-semibold text-slate-200">Connecting Street View Panorama...</p>
        </div>
      )}

      {showFallback ? (
        <div className="relative w-full h-full bg-slate-950/95 flex flex-col items-center justify-center p-3 text-center">
          {/* Subtle Cyber Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />

          <div className="relative z-10 flex flex-col items-center max-w-[340px]">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium mb-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>
                {authError
                  ? 'Google Maps API Restricted / Unbilled Key'
                  : 'Street View Unavailable on this Route'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-tight mb-2">
              {authError
                ? 'Street View requires a Google Cloud API key with billing enabled. Spatial telemetry remains 100% active.'
                : 'No 360° road panorama coverage is available at these coordinates.'}
            </p>

            {/* GPS Telemetry Pill */}
            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg text-[10px] text-slate-300 mb-3">
              <span className="flex items-center gap-1 font-mono text-cyan-400">
                <MapPin className="h-3 w-3" />
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
              <span className="flex items-center gap-1 font-mono text-amber-400">
                <Compass className="h-3 w-3" />
                {heading.toFixed(0)}°
              </span>
            </div>

            {/* Quick Action Switchers */}
            {onSwitchMode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSwitchMode('camera')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition shadow-sm"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>Live AI Feed</span>
                </button>
                <button
                  onClick={() => onSwitchMode('3d')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition border border-slate-700"
                >
                  <Box className="h-3.5 w-3.5" />
                  <span>3D Bus Model</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full min-h-[190px]" />
      )}
    </div>
  );
};

