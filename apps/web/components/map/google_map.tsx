'use client';

import React, { useEffect, useRef } from 'react';
import { Bus, DetectionEvent } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface GoogleMapProps {
  buses: Bus[];
  events: DetectionEvent[];
}

const EVENT_COLOR_MAP: Record<string, string> = {
  POTHOLE: '#eab308',      // yellow
  ROAD_DAMAGE: '#f97316',  // orange
  WATERLOGGING: '#06b6d4', // cyan
  TRAFFIC: '#ef4444',      // red
  TRAFFIC_SIGN: '#3b82f6',  // blue
  ZEBRA_CROSSING: '#8b5cf6',// purple
  PEDESTRIAN_RISK: '#ec4899',// pink
  INCIDENT: '#dc2626'      // dark red
};

// Route polylines for visualization
const ROUTE_POLYLINES: Record<string, { lat: number; lng: number }[]> = {
  "Route 101 - Central Corridor": [
    { lat: 19.0760, lng: 72.8777 },
    { lat: 19.0820, lng: 72.8830 },
    { lat: 19.0900, lng: 72.8900 },
    { lat: 19.0980, lng: 72.8850 },
    { lat: 19.0900, lng: 72.8750 },
    { lat: 19.0760, lng: 72.8777 }
  ],
  "Route 202 - West Coast Line": [
    { lat: 19.0400, lng: 72.8200 },
    { lat: 19.0500, lng: 72.8300 },
    { lat: 19.0650, lng: 72.8350 },
    { lat: 19.0800, lng: 72.8400 },
    { lat: 19.0650, lng: 72.8350 },
    { lat: 19.0400, lng: 72.8200 }
  ],
  "Route 303 - Express Ring": [
    { lat: 19.1100, lng: 72.8600 },
    { lat: 19.1200, lng: 72.8750 },
    { lat: 19.1150, lng: 72.8900 },
    { lat: 19.1000, lng: 72.8800 },
    { lat: 19.1100, lng: 72.8600 }
  ]
};

export const GoogleMapView: React.FC<GoogleMapProps> = ({ buses, events }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapObjRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (!apiKey || typeof window === 'undefined') return;

    const loadGoogleMapsScript = () => {
      if ((window as any).google && (window as any).google.maps) {
        initMap();
        return;
      }

      const existingScript = document.getElementById('google-maps-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => initMap();
        document.head.appendChild(script);
      }
    };

    const initMap = () => {
      if (!mapRef.current || googleMapObjRef.current) return;
      
      const defaultCenter = { lat: 19.0760, lng: 72.8777 }; // Mumbai default center
      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 12,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      googleMapObjRef.current = map;

      // Draw route polylines
      const colors = ['#2563eb', '#059669', '#d97706'];
      let colorIdx = 0;
      Object.entries(ROUTE_POLYLINES).forEach(([routeName, path]) => {
        const polyline = new (window as any).google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: colors[colorIdx % colors.length],
          strokeOpacity: 0.7,
          strokeWeight: 4,
          map
        });
        polylinesRef.current.push(polyline);
        colorIdx++;
      });
    };

    loadGoogleMapsScript();
  }, [apiKey]);

  // Update Markers dynamically when buses or events change
  useEffect(() => {
    if (!googleMapObjRef.current || !(window as any).google) return;
    const google = (window as any).google;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Render Bus Markers
    buses.forEach((bus) => {
      const busMarker = new google.maps.Marker({
        position: { lat: bus.latitude, lng: bus.longitude },
        map: googleMapObjRef.current,
        title: `${bus.bus_number} (${bus.route_name}) - ${bus.speed} km/h`,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#ffffff",
          rotation: bus.heading
        }
      });
      markersRef.current.push(busMarker);
    });

    // Render Event Markers
    events.forEach((ev) => {
      const color = EVENT_COLOR_MAP[ev.event_type] || '#ef4444';
      const eventMarker = new google.maps.Marker({
        position: { lat: ev.latitude, lng: ev.longitude },
        map: googleMapObjRef.current,
        title: `[${ev.event_type}] Severity: ${ev.severity} - Bus: ${ev.bus_id}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: color,
          fillOpacity: 0.9,
          strokeWeight: 1.5,
          strokeColor: "#ffffff"
        }
      });
      markersRef.current.push(eventMarker);
    });
  }, [buses, events]);

  return (
    <Card className="h-full flex flex-col min-h-[420px]">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <span>Live Map & Fleet GIS Visualization</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-normal">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-blue-600 inline-block"></span>
              <span>Bus Fleet ({buses.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-amber-500 inline-block"></span>
              <span>Defects & Events ({events.length})</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative rounded-b-lg overflow-hidden min-h-[360px]">
        {apiKey ? (
          <div ref={mapRef} className="w-full h-full min-h-[360px]" />
        ) : (
          <div className="w-full h-full min-h-[360px] bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <MapPin className="h-10 w-10 text-slate-400 mb-2" />
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">Google Maps Integration Ready</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              Please configure <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">apps/web/.env.local</code> to render interactive Google Maps.
            </p>
            <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg text-left text-xs border border-slate-200 dark:border-slate-700 w-full max-w-sm">
              <div className="font-semibold mb-1 text-slate-700 dark:text-slate-300">Simulated Fleet Overview:</div>
              <div className="text-slate-600 dark:text-slate-400">Buses: {buses.length} active</div>
              <div className="text-slate-600 dark:text-slate-400">Events: {events.length} detected</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
