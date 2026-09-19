'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import type {
  Bus,
  DetectionEvent,
  LayerState,
  MapOptionsState,
  MapStyleKey,
} from '@/types';
import { EVENT_COLORS, EVENT_LAYER } from '@/lib/format';
import { fleetState } from '@/lib/fleet';
import { loadGoogleMaps, mapsApiKey } from '@/lib/maps_loader';
import { resolveMapTypeId, resolveStyles } from '@/lib/map_styles';
import { CITY_CENTER, ROUTES, getRoute } from '@/lib/routes';
import {
  SPRITE_PX,
  busSprites,
  headingFrame,
  type SpriteVariant,
} from '@/lib/bus_sprites';

export interface MapHandle {
  panTo: (lat: number, lng: number, zoom?: number) => void;
  fitFleet: () => void;
  zoomBy: (delta: number) => void;
  toggleFullscreen: () => void;
  resetView: () => void;
}

interface OpsMapProps {
  buses: Bus[];
  events: DetectionEvent[];
  layers: LayerState;
  mapStyle: MapStyleKey;
  options: MapOptionsState;
  radarTemplate: string | null;
  selectedBusId: string | null;
  selectedEventId: string | null;
  onSelectBus: (busId: string | null) => void;
  onSelectEvent: (eventId: string | null) => void;
  onReady?: () => void;
}

const BUS_GLYPH = 'M 0 -11 L 7.4 9.5 L 0 5 L -7.4 9.5 Z';

/** On-screen size of the bus model marker, in pixels. */
const BUS_MARKER_PX = 38;
const BUS_MARKER_PX_SELECTED = 50;

const BUS_FILL: Record<string, string> = {
  ACTIVE: '#4C86C6',
  IDLE: '#93A2B0',
  OFFLINE: '#55636F',
};

/** Tilted imagery is only available on satellite basemaps at close zoom. */
const TILT_MIN_ZOOM = 17;

interface BusMotionState {
  startLat: number;
  startLng: number;
  startHeading: number;
  targetLat: number;
  targetLng: number;
  targetHeading: number;
  currentLat: number;
  currentLng: number;
  currentHeading: number;
  speed: number;
  status: string;
  updateTime: number;
  duration: number;
}

export const OpsMap = forwardRef<MapHandle, OpsMapProps>(function OpsMap(
  {
    buses,
    events,
    layers,
    mapStyle,
    options,
    radarTemplate,
    selectedBusId,
    selectedEventId,
    onSelectBus,
    onSelectEvent,
    onReady,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const busMarkers = useRef(new Map<string, google.maps.Marker>());
  const busMotionStates = useRef(new Map<string, BusMotionState>());
  const eventMarkers = useRef(new Map<string, google.maps.Marker>());
  const routeLines = useRef(new Map<string, google.maps.Polyline>());
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);
  const radarRef = useRef<google.maps.ImageMapType | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const didFitRef = useRef(false);
  const [sprites, setSprites] = useState<Record<SpriteVariant, string[]> | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const apiKey = mapsApiKey();

  // Latest selection, read inside marker click handlers without re-binding them.
  const selectionRef = useRef({ selectedBusId, selectedEventId });
  selectionRef.current = { selectedBusId, selectedEventId };

  /* ---------------------------------------------------------------- init */
  useEffect(() => {
    if (!apiKey) {
      setLoadError('Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to apps/web/.env.local to load the map.');
      return;
    }

    let cancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || mapRef.current) return;
        if (!containerRef.current) {
          setLoadError('The map container disappeared before the map could start.');
          return;
        }

        const map = new maps.Map(containerRef.current, {
          center: CITY_CENTER,
          zoom: 13,
          mapTypeId: resolveMapTypeId(mapStyle, options.labels),
          styles: resolveStyles(mapStyle, options.labels),
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          keyboardShortcuts: true,
          rotateControl: false,
          backgroundColor: '#0B0E12',
        });

        map.addListener('click', () => {
          onSelectBus(null);
          onSelectEvent(null);
        });

        mapRef.current = map;

        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          const observer = new ResizeObserver(() => {
            const center = map.getCenter();
            maps.event.trigger(map, 'resize');
            if (center) map.setCenter(center);
          });
          observer.observe(containerRef.current);
          resizeObserverRef.current = observer;
        }

        setReady(true);
        onReady?.();
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [apiKey]);

  /* ---------------------------------------------------- bus model sprites */
  useEffect(() => {
    let cancelled = false;
    busSprites().then((frames) => {
      if (!cancelled) setSprites(frames);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------------------------------------------- basemap style */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMapTypeId(resolveMapTypeId(mapStyle, options.labels));
    map.setOptions({ styles: resolveStyles(mapStyle, options.labels) });
  }, [ready, mapStyle, options.labels]);

  /* -------------------------------------------------------------- 3D tilt */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const tiltable = mapStyle !== 'streets';
    if (options.threeD && tiltable) {
      if ((map.getZoom() ?? 0) < TILT_MIN_ZOOM) map.setZoom(TILT_MIN_ZOOM);
      map.setOptions({ rotateControl: true });
      map.setTilt(45);
    } else {
      map.setTilt(0);
      map.setHeading(0);
      map.setOptions({ rotateControl: false });
    }
  }, [ready, options.threeD, mapStyle]);

  /* ------------------------------------------------------- traffic overlay */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!maps) return;

    if (options.trafficLayer) {
      if (!trafficRef.current) trafficRef.current = new maps.TrafficLayer();
      trafficRef.current.setMap(map);
    } else {
      trafficRef.current?.setMap(null);
    }
  }, [ready, options.trafficLayer]);

  /* --------------------------------------------------- precipitation radar */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!maps) return;

    const removeRadar = () => {
      if (!radarRef.current) return;
      const overlays = map.overlayMapTypes;
      for (let i = overlays.getLength() - 1; i >= 0; i -= 1) {
        if (overlays.getAt(i) === radarRef.current) overlays.removeAt(i);
      }
      radarRef.current = null;
    };

    if (!options.weather || !radarTemplate) {
      removeRadar();
      return;
    }

    if (radarRef.current) return;

    const overlay = new maps.ImageMapType({
      name: 'Precipitation',
      tileSize: new maps.Size(256, 256),
      maxZoom: 14,
      opacity: 0.55,
      getTileUrl: (coord: google.maps.Point, zoom: number) => {
        const scale = 1 << zoom;
        const x = ((coord.x % scale) + scale) % scale;
        if (coord.y < 0 || coord.y >= scale) return null as unknown as string;
        return radarTemplate
          .replace('{z}', String(zoom))
          .replace('{x}', String(x))
          .replace('{y}', String(coord.y));
      },
    });

    radarRef.current = overlay;
    map.overlayMapTypes.push(overlay);

    return removeRadar;
  }, [ready, options.weather, radarTemplate]);

  /* -------------------------------------------------------------- routes */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!maps) return;

    const selectedBus = buses.find((bus) => bus.id === selectedBusId);
    const activeRouteId = selectedBus ? getRoute(selectedBus.route_name)?.id : undefined;

    Object.values(ROUTES).forEach((route) => {
      let line = routeLines.current.get(route.id);
      if (!line) {
        line = new maps.Polyline({
          path: route.path,
          geodesic: true,
          clickable: false,
        });
        routeLines.current.set(route.id, line);
      }

      const highlighted = route.id === activeRouteId;
      line.setOptions({
        strokeColor: highlighted ? '#4C86C6' : '#3A5D80',
        strokeOpacity: highlighted ? 0.95 : 0.5,
        strokeWeight: highlighted ? 4 : 2.5,
        zIndex: highlighted ? 20 : 5,
      });
      line.setMap(layers.routes ? map : null);
    });
  }, [ready, layers.routes, selectedBusId, buses]);

  /* ---------------------------------------------------------- bus markers */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!maps) return;

    const now = Date.now();
    const perfNow = performance.now();
    const seen = new Set<string>();

    buses.forEach((bus) => {
      seen.add(bus.id);
      const state = fleetState(bus, now);
      const selected = bus.id === selectedBusId;
      const variant: SpriteVariant = selected ? 'SELECTED' : state;
      const frames = sprites?.[variant];

      const size = selected ? BUS_MARKER_PX_SELECTED : BUS_MARKER_PX;
      const icon: google.maps.Icon | google.maps.Symbol = frames
        ? {
            url: frames[headingFrame(bus.heading)],
            size: new maps.Size(SPRITE_PX, SPRITE_PX),
            scaledSize: new maps.Size(size, size),
            anchor: new maps.Point(size / 2, size / 2),
          }
        : {
            path: BUS_GLYPH,
            scale: selected ? 1.6 : 1.25,
            fillColor: selected ? '#7FB2E5' : BUS_FILL[state],
            fillOpacity: state === 'OFFLINE' ? 0.55 : 1,
            strokeColor: selected ? '#EAF2FA' : '#0B0E12',
            strokeWeight: selected ? 1.6 : 1,
            rotation: bus.heading,
            anchor: new maps.Point(0, 0),
          };

      // Update Motion Interpolation State
      const existingMotion = busMotionStates.current.get(bus.id);
      if (!existingMotion) {
        busMotionStates.current.set(bus.id, {
          startLat: bus.latitude,
          startLng: bus.longitude,
          startHeading: bus.heading,
          targetLat: bus.latitude,
          targetLng: bus.longitude,
          targetHeading: bus.heading,
          currentLat: bus.latitude,
          currentLng: bus.longitude,
          currentHeading: bus.heading,
          speed: bus.speed,
          status: bus.status,
          updateTime: perfNow,
          duration: 1000,
        });
      } else {
        const elapsed = perfNow - existingMotion.updateTime;
        existingMotion.startLat = existingMotion.currentLat;
        existingMotion.startLng = existingMotion.currentLng;
        existingMotion.startHeading = existingMotion.currentHeading;

        existingMotion.targetLat = bus.latitude;
        existingMotion.targetLng = bus.longitude;
        existingMotion.targetHeading = bus.heading;
        existingMotion.speed = bus.speed;
        existingMotion.status = bus.status;
        existingMotion.duration = Math.max(400, elapsed);
        existingMotion.updateTime = perfNow;
      }

      let marker = busMarkers.current.get(bus.id);
      if (!marker) {
        marker = new maps.Marker({
          position: { lat: bus.latitude, lng: bus.longitude },
          map,
          icon,
          title: `${bus.bus_number} · Route ${bus.route_name}`,
          zIndex: selected ? 400 : 200,
          optimized: false,
        });
        marker.addListener('click', () => {
          onSelectEvent(null);
          onSelectBus(selectionRef.current.selectedBusId === bus.id ? null : bus.id);
        });
        busMarkers.current.set(bus.id, marker);
      } else {
        marker.setTitle(`${bus.bus_number} · Route ${bus.route_name}`);
        marker.setZIndex(selected ? 400 : 200);
      }
      marker.setMap(layers.buses ? map : null);
    });

    busMarkers.current.forEach((marker, id) => {
      if (seen.has(id)) return;
      marker.setMap(null);
      busMarkers.current.delete(id);
      busMotionStates.current.delete(id);
    });
  }, [ready, buses, layers.buses, selectedBusId, sprites, onSelectBus, onSelectEvent]);

  /* ------------------------------------------------ 60 FPS Real-Time Motion Engine */
  useEffect(() => {
    if (!ready) return;

    let animId: number;
    let lastTime = performance.now();

    const animateBusMotion = () => {
      const now = performance.now();
      const dtSeconds = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const maps = (window as any).google?.maps as typeof google.maps | undefined;

      buses.forEach((bus) => {
        const state = busMotionStates.current.get(bus.id);
        const marker = busMarkers.current.get(bus.id);
        if (!state || !marker) return;

        const elapsed = now - state.updateTime;
        const progress = Math.min(1.0, elapsed / state.duration);

        let curLat: number;
        let curLng: number;
        let curHeading: number;

        if (progress < 1.0) {
          // LERP Position
          curLat = state.startLat + (state.targetLat - state.startLat) * progress;
          curLng = state.startLng + (state.targetLng - state.startLng) * progress;

          // Shortest-path Angle LERP Heading
          const diffHeading = ((state.targetHeading - state.startHeading + 540) % 360) - 180;
          curHeading = (state.startHeading + diffHeading * progress + 360) % 360;
        } else {
          // Dead Reckoning: Keep gliding along heading vector if bus is active & moving
          if (state.status === 'ACTIVE' && state.speed > 0) {
            const speedMps = (state.speed * 1000) / 3600;
            const distMeters = speedMps * dtSeconds;
            const headingRad = (state.targetHeading * Math.PI) / 180;

            const dLat = (distMeters * Math.cos(headingRad)) / 111320;
            const dLng =
              (distMeters * Math.sin(headingRad)) /
              (111320 * Math.cos((state.currentLat * Math.PI) / 180));

            curLat = state.currentLat + dLat;
            curLng = state.currentLng + dLng;
            curHeading = state.targetHeading;
          } else {
            curLat = state.targetLat;
            curLng = state.targetLng;
            curHeading = state.targetHeading;
          }
        }

        state.currentLat = curLat;
        state.currentLng = curLng;
        state.currentHeading = curHeading;

        // Smoothly update marker position
        marker.setPosition({ lat: curLat, lng: curLng });

        // Smoothly update 360° vehicle sprite orientation frame
        if (maps && sprites) {
          const selected = bus.id === selectionRef.current.selectedBusId;
          const sState = fleetState(bus, Date.now());
          const variant: SpriteVariant = selected ? 'SELECTED' : sState;
          const frames = sprites[variant];
          const size = selected ? BUS_MARKER_PX_SELECTED : BUS_MARKER_PX;

          if (frames) {
            const frameIdx = headingFrame(curHeading);
            marker.setIcon({
              url: frames[frameIdx],
              size: new maps.Size(SPRITE_PX, SPRITE_PX),
              scaledSize: new maps.Size(size, size),
              anchor: new maps.Point(size / 2, size / 2),
            });
          }
        }
      });

      animId = requestAnimationFrame(animateBusMotion);
    };

    animId = requestAnimationFrame(animateBusMotion);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [ready, buses, sprites]);

  /* -------------------------------------------------------- event markers */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!maps) return;

    const seen = new Set<string>();

    events.forEach((event) => {
      seen.add(event.id);
      const selected = event.id === selectedEventId;
      const resolved = event.status === 'RESOLVED';
      const color = EVENT_COLORS[event.event_type] ?? '#C9922F';
      const prominent = event.severity === 'CRITICAL' || event.severity === 'HIGH';

      const icon: google.maps.Symbol = {
        path: maps.SymbolPath.CIRCLE,
        scale: selected ? 7.5 : prominent ? 5.2 : 4.2,
        fillColor: color,
        fillOpacity: resolved ? 0.3 : 0.85,
        strokeColor: selected ? '#EAF2FA' : '#0B0E12',
        strokeWeight: selected ? 1.8 : 1.1,
      };

      let marker = eventMarkers.current.get(event.id);
      if (!marker) {
        marker = new maps.Marker({
          position: { lat: event.latitude, lng: event.longitude },
          map,
          icon,
          zIndex: selected ? 500 : 100,
        });
        marker.addListener('click', () => {
          onSelectBus(null);
          onSelectEvent(selectionRef.current.selectedEventId === event.id ? null : event.id);
        });
        eventMarkers.current.set(event.id, marker);
      } else {
        marker.setIcon(icon);
        marker.setZIndex(selected ? 500 : 100);
      }

      marker.setMap(layers[EVENT_LAYER[event.event_type]] ? map : null);
    });

    eventMarkers.current.forEach((marker, id) => {
      if (seen.has(id)) return;
      marker.setMap(null);
      eventMarkers.current.delete(id);
    });
  }, [ready, events, layers, selectedEventId, onSelectBus, onSelectEvent]);

  /* ----------------------------------------------- first fit to the fleet */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || didFitRef.current || !buses.length) return;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!maps) return;

    const bounds = new maps.LatLngBounds();
    buses.forEach((bus) => bounds.extend({ lat: bus.latitude, lng: bus.longitude }));
    map.fitBounds(bounds, 64);
    didFitRef.current = true;
  }, [ready, buses]);

  /* ------------------------------------------------------ imperative API */
  const fitFleet = useCallback(() => {
    const map = mapRef.current;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!map || !maps || !buses.length) return;
    const bounds = new maps.LatLngBounds();
    buses.forEach((bus) => bounds.extend({ lat: bus.latitude, lng: bus.longitude }));
    map.fitBounds(bounds, 64);
  }, [buses]);

  useImperativeHandle(
    ref,
    () => ({
      panTo: (lat, lng, zoom) => {
        const map = mapRef.current;
        if (!map) return;
        map.panTo({ lat, lng });
        if (zoom && (map.getZoom() ?? 0) < zoom) map.setZoom(zoom);
      },
      fitFleet,
      zoomBy: (delta) => {
        const map = mapRef.current;
        if (!map) return;
        map.setZoom((map.getZoom() ?? 13) + delta);
      },
      toggleFullscreen: () => {
        const node = containerRef.current?.parentElement;
        if (!node) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else node.requestFullscreen?.();
      },
      resetView: () => {
        const map = mapRef.current;
        if (!map) return;
        map.setHeading(0);
        map.setTilt(0);
        map.setCenter(CITY_CENTER);
        map.setZoom(13);
      },
    }),
    [fitFleet]
  );

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0 bg-canvas" />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas px-6">
          <div className="max-w-sm border border-line bg-panel p-4">
            <p className="text-ink">The map could not start.</p>
            <p className="mt-1 text-dim">{loadError}</p>
            <p className="mt-3 text-faint">
              Telemetry and detections keep arriving; only the basemap is missing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
