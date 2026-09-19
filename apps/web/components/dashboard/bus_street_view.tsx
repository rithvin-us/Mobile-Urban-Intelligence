'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, mapsApiKey } from '@/lib/maps_loader';
import { MapPin, RefreshCw } from 'lucide-react';

interface BusStreetViewProps {
  latitude: number;
  longitude: number;
  heading?: number;
  className?: string;
}

export const BusStreetView: React.FC<BusStreetViewProps> = ({
  latitude,
  longitude,
  heading = 0,
  className = 'w-full h-full'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noCoverage, setNoCoverage] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!containerRef.current) return;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const busPos = { lat: latitude, lng: longitude };

        // Check Street View Service Availability nearby (radius: 100 meters)
        const svService = new maps.StreetViewService();
        svService.getPanorama({ location: busPos, radius: 100 }, (data, status) => {
          if (cancelled) return;

          if (status === maps.StreetViewStatus.OK && data && data.location) {
            setNoCoverage(false);
            const panorama = new maps.StreetViewPanorama(containerRef.current!, {
              position: data.location.latLng || busPos,
              pov: { heading: heading, pitch: 0 },
              zoom: 1,
              disableDefaultUI: true,
              showRoadLabels: true,
              clickToGo: true,
            });

            panoramaRef.current = panorama;
            setLoading(false);
          } else {
            console.warn('No Google Street View coverage found nearby:', status);
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
    };
  }, [latitude, longitude, heading]);

  const apiKey = mapsApiKey();
  const staticSvUrl = apiKey
    ? `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${latitude},${longitude}&heading=${heading}&pitch=0&fov=90&key=${apiKey}`
    : null;

  return (
    <div className={`relative overflow-hidden bg-slate-950 ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur flex flex-col items-center justify-center p-4">
          <RefreshCw className="h-6 w-6 text-blue-400 animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-200">Loading Street View Panorama...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center">
          <MapPin className="h-6 w-6 text-amber-400 mb-2" />
          <p className="text-xs font-medium text-slate-300">{error}</p>
        </div>
      )}

      {noCoverage ? (
        <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
          {staticSvUrl ? (
            <img
              src={staticSvUrl}
              alt="Street View Preview"
              className="absolute inset-0 w-full h-full object-cover opacity-60"
              onError={() => setNoCoverage(true)}
            />
          ) : null}
          <div className="relative z-10 bg-slate-950/85 backdrop-blur px-3 py-2 rounded-xl border border-slate-800">
            <MapPin className="h-5 w-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-100">Location Telemetry Active</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)} • Heading {heading.toFixed(0)}°
            </p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full min-h-[190px]" />
      )}
    </div>
  );
};
