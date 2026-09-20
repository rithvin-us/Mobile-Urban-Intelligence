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
import { loadGoogleMaps, mapsApiKey, onMapsAuthFailure } from '@/lib/maps_loader';
import { resolveMapTypeId, resolveStyles } from '@/lib/map_styles';
import { CITY_CENTER, ROUTES, getRoute } from '@/lib/routes';
import {
  SPRITE_PX,
  busSprites,
  headingFrame,
  type SpriteVariant,
} from '@/lib/bus_sprites';
import { getSnappedRoutePath, snapCoordinateToPolyline } from '@/lib/road_snapper';
import { createGpuOverlay, type GpuOverlayHandle } from '@/components/map/gpu_overlay';

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
  themeMode?: 'dark' | 'light';
  radarTemplate: string | null;
  selectedBusId: string | null;
  selectedEventId: string | null;
  /** Draw detections with deck.gl on the GPU instead of one DOM marker each. */
  gpuMarkers: boolean;
  onSelectBus: (busId: string | null) => void;
  onSelectEvent: (eventId: string | null) => void;
  onReady?: () => void;
}

const BUS_GLYPH = 'M 0 -11 L 7.4 9.5 L 0 5 L -7.4 9.5 Z';

/** On-screen size of the bus model marker, in pixels. */
const BUS_MARKER_PX = 38;
const BUS_MARKER_PX_SELECTED = 50;

const BUS_FILL: Record<string, string> = {
  ACTIVE: '#D9A441',
  IDLE: '#9AA5B1',
  OFFLINE: '#5C6773',
};

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
  /** Last snapped segment, so the next frame searches its neighbourhood only. */
  segmentHint?: number;
  /** Last icon frame written to the marker, so identical frames are not rewritten. */
  drawnFrame: number;
  drawnVariant: SpriteVariant | null;
}

export const OpsMap = forwardRef<MapHandle, OpsMapProps>(function OpsMap(
  {
    buses,
    events,
    layers,
    mapStyle,
    options,
    themeMode = 'dark',
    radarTemplate,
    selectedBusId,
    selectedEventId,
    gpuMarkers,
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
  const drawnPaths = useRef(new Map<string, { lat: number; lng: number }[]>());
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);
  const radarRef = useRef<google.maps.ImageMapType | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const gpuRef = useRef<GpuOverlayHandle | null>(null);
  const didFitRef = useRef(false);
  const [sprites, setSprites] = useState<Record<SpriteVariant, string[]> | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // True only once deck.gl has actually started. If the overlay cannot be
  // created — no WebGL2, a blocked chunk — the DOM markers have to come back,
  // or the map would silently show no detections at all.
  const [gpuActive, setGpuActive] = useState(false);

  const apiKey = mapsApiKey();

  /*
   * The animation loop reads the latest telemetry through refs. Depending on
   * `buses` directly would tear down and restart requestAnimationFrame on every
   * poll, which is exactly the stutter that reads as a laggy map.
   */
  const busesRef = useRef(buses);
  busesRef.current = buses;
  const spritesRef = useRef(sprites);
  spritesRef.current = sprites;
  const selectionRef = useRef({ selectedBusId, selectedEventId });
  selectionRef.current = { selectedBusId, selectedEventId };
  const handlersRef = useRef({ onSelectBus, onSelectEvent });
  handlersRef.current = { onSelectBus, onSelectEvent };

  /* ---------------------------------------------------------------- init */
  useEffect(() => {
    if (!apiKey) {
      setLoadError('Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to apps/web/.env.local to load the map.');
      return;
    }

    let cancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) {
          setLoadError('The map container disappeared before the map could start.');
          return;
        }

        // React's development double-invoke can hand this effect a fresh
        // container while an earlier map is still bound to the discarded one.
        // Guarding on "a map exists" alone leaves that orphan attached to a
        // detached node, so the console renders with no basemap under it. The
        // guard is on the node instead: same node, keep the map; new node,
        // build again and let the old one be collected.
        if (mapRef.current) {
          const boundTo = mapRef.current.getDiv();
          if (boundTo === container && container.isConnected) {
            setReady(true);
            return;
          }
          busMarkers.current.forEach((marker) => marker.setMap(null));
          busMarkers.current.clear();
          busMotionStates.current.clear();
          eventMarkers.current.forEach((marker) => marker.setMap(null));
          eventMarkers.current.clear();
          routeLines.current.forEach((line) => line.setMap(null));
          routeLines.current.clear();
          trafficRef.current = null;
          radarRef.current = null;
          didFitRef.current = false;
        }

        const map = new maps.Map(container, {
          center: CITY_CENTER,
          zoom: 13,
          mapTypeId: resolveMapTypeId(mapStyle, options.labels),
          styles: resolveStyles(mapStyle, options.labels, themeMode),
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          keyboardShortcuts: true,
          rotateControl: false,
          backgroundColor: themeMode === 'light' ? '#E9EAE5' : '#0E1216',
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

  /* ------------------------------------------- rejected Maps credentials */
  useEffect(
    () =>
      onMapsAuthFailure(() =>
        setLoadError(
          'Google rejected the Maps key. Check that billing is on for the project, that the ' +
            'Maps JavaScript API is enabled, and that this origin is allowed by the referrer ' +
            'restrictions on the key.'
        )
      ),
    []
  );

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
    map.setOptions({
      styles: resolveStyles(mapStyle, options.labels, themeMode),
      backgroundColor: themeMode === 'light' ? '#E9EAE5' : '#0E1216',
    });
  }, [ready, mapStyle, options.labels, themeMode]);

  /* -------------------------------------------------------------- 3D tilt */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (options.threeD) {
      if ((map.getZoom() ?? 0) < 15) map.setZoom(16);
      map.setOptions({ rotateControl: true, streetViewControl: true });
      map.setTilt(45);
    } else {
      map.setTilt(0);
      map.setHeading(0);
      map.setOptions({ rotateControl: false, streetViewControl: true });
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

    const TRANSPARENT_TILE =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const overlay = new maps.ImageMapType({
      name: 'Precipitation',
      tileSize: new maps.Size(256, 256),
      minZoom: 1,
      maxZoom: 12,
      opacity: 0.55,
      getTileUrl: (coord: google.maps.Point, zoom: number) => {
        if (zoom < 1 || zoom > 12) return TRANSPARENT_TILE;
        const scale = 1 << zoom;
        const x = ((coord.x % scale) + scale) % scale;
        if (coord.y < 0 || coord.y >= scale) return TRANSPARENT_TILE;
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

    const selectedBus = busesRef.current.find((bus) => bus.id === selectedBusId);
    const activeRouteId = selectedBus ? getRoute(selectedBus.route_name)?.id : undefined;

    Object.values(ROUTES).forEach((route) => {
      let line = routeLines.current.get(route.id);
      if (!line) {
        line = new maps.Polyline({ path: route.path, geodesic: true, clickable: false });
        routeLines.current.set(route.id, line);
        drawnPaths.current.set(route.id, route.path);

        // Directions gives the true street centreline. It is fetched once per
        // route and then reused for both the drawn line and the snap target,
        // so the vehicles ride exactly the geometry the operator can see.
        getSnappedRoutePath(route).then((snappedPath) => {
          if (line && snappedPath && snappedPath.length > 0) {
            line.setPath(snappedPath);
            drawnPaths.current.set(route.id, snappedPath);
          }
        });
      }

      const highlighted = route.id === activeRouteId;
      line.setOptions({
        strokeColor: highlighted ? '#F0B429' : themeMode === 'light' ? '#6B7684' : '#3E4A57',
        strokeOpacity: highlighted ? 0.95 : 0.55,
        strokeWeight: highlighted ? 4 : 2.5,
        zIndex: highlighted ? 20 : 5,
      });
      line.setMap(layers.routes ? map : null);
    });
  }, [ready, layers.routes, selectedBusId, themeMode, buses]);

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
          drawnFrame: -1,
          drawnVariant: null,
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
          icon: {
            path: BUS_GLYPH,
            scale: selected ? 1.6 : 1.25,
            fillColor: selected ? '#F5CE7A' : BUS_FILL[state],
            fillOpacity: state === 'OFFLINE' ? 0.55 : 1,
            strokeColor: selected ? '#EAF2FA' : '#0B0E12',
            strokeWeight: selected ? 1.6 : 1,
            rotation: bus.heading,
            anchor: new maps.Point(0, 0),
          },
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

    // A selection change alters which sprite variant a bus draws, so the cached
    // frame has to be invalidated or the ring colour would never update.
    busMotionStates.current.forEach((state) => {
      state.drawnVariant = null;
    });

    busMarkers.current.forEach((marker, id) => {
      if (seen.has(id)) return;
      marker.setMap(null);
      busMarkers.current.delete(id);
      busMotionStates.current.delete(id);
    });
  }, [ready, buses, layers.buses, selectedBusId, sprites, onSelectBus, onSelectEvent]);

  /* -------------------------------------------- vehicle motion, 60 fps */
  useEffect(() => {
    if (!ready) return;

    let animId = 0;
    let lastTime = performance.now();

    // Marker icons are rebuilt only when the sprite frame actually changes, so
    // a straight run costs no allocation at all. Size and anchor objects are
    // shared per marker size for the same reason.
    const geometryCache = new Map<number, { size: any; scaled: any; anchor: any }>();
    const geometryFor = (maps: typeof google.maps, px: number) => {
      let entry = geometryCache.get(px);
      if (!entry) {
        entry = {
          size: new maps.Size(SPRITE_PX, SPRITE_PX),
          scaled: new maps.Size(px, px),
          anchor: new maps.Point(px / 2, px / 2),
        };
        geometryCache.set(px, entry);
      }
      return entry;
    };

    const animate = () => {
      const now = performance.now();
      const dtSeconds = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const maps = (window as any).google?.maps as typeof google.maps | undefined;
      const activeSprites = spritesRef.current;
      const wallNow = Date.now();

      busesRef.current.forEach((bus) => {
        const state = busMotionStates.current.get(bus.id);
        const marker = busMarkers.current.get(bus.id);
        if (!state || !marker) return;

        const elapsed = now - state.updateTime;
        const progress = Math.min(1, elapsed / state.duration);

        let curLat: number;
        let curLng: number;
        let curHeading: number;

        if (progress < 1) {
          curLat = state.startLat + (state.targetLat - state.startLat) * progress;
          curLng = state.startLng + (state.targetLng - state.startLng) * progress;
          const diffHeading = ((state.targetHeading - state.startHeading + 540) % 360) - 180;
          curHeading = (state.startHeading + diffHeading * progress + 360) % 360;
        } else if (state.status === 'ACTIVE' && state.speed > 0) {
          // Dead reckoning between fixes: keep gliding along the heading vector
          // so a one-second telemetry tick does not read as a one-second freeze.
          const speedMps = (state.speed * 1000) / 3600;
          const distMeters = speedMps * dtSeconds;
          const headingRad = (state.targetHeading * Math.PI) / 180;
          curLat = state.currentLat + (distMeters * Math.cos(headingRad)) / 111320;
          curLng =
            state.currentLng +
            (distMeters * Math.sin(headingRad)) /
              (111320 * Math.cos((state.currentLat * Math.PI) / 180));
          curHeading = state.targetHeading;
        } else {
          curLat = state.targetLat;
          curLng = state.targetLng;
          curHeading = state.targetHeading;
        }

        // Keep the vehicle on the drawn corridor. The search is windowed around
        // last frame's segment, so the cost does not grow with route length.
        const routeDef = getRoute(bus.route_name);
        const path = routeDef ? drawnPaths.current.get(routeDef.id) ?? routeDef.path : null;
        if (path && path.length >= 2) {
          const snapped = snapCoordinateToPolyline(curLat, curLng, path, state.segmentHint);
          curLat = snapped.lat;
          curLng = snapped.lng;
          if (snapped.heading >= 0) curHeading = snapped.heading;
          state.segmentHint = snapped.segment;
        }

        state.currentLat = curLat;
        state.currentLng = curLng;
        state.currentHeading = curHeading;

        marker.setPosition({ lat: curLat, lng: curLng });

        if (maps && activeSprites) {
          const selected = bus.id === selectionRef.current.selectedBusId;
          const variant: SpriteVariant = selected ? 'SELECTED' : fleetState(bus, wallNow);
          const frameIdx = headingFrame(curHeading);
          if (frameIdx !== state.drawnFrame || variant !== state.drawnVariant) {
            const frames = activeSprites[variant];
            if (frames) {
              const px = selected ? BUS_MARKER_PX_SELECTED : BUS_MARKER_PX;
              const geometry = geometryFor(maps, px);
              marker.setIcon({
                url: frames[frameIdx],
                size: geometry.size,
                scaledSize: geometry.scaled,
                anchor: geometry.anchor,
              });
              state.drawnFrame = frameIdx;
              state.drawnVariant = variant;
            }
          }
        }
      });

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [ready]);

  /* ----------------------------------------------- detections on the GPU */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !gpuMarkers) return;

    let cancelled = false;
    // Creating a WebGL overlay is expensive, so it must outlive a render. The
    // click handler reads the current callbacks through a ref rather than
    // capturing them, which keeps this effect off the render path entirely.
    createGpuOverlay(map, (eventId) => {
      handlersRef.current.onSelectBus(null);
      handlersRef.current.onSelectEvent(
        selectionRef.current.selectedEventId === eventId ? null : eventId
      );
    }).then((handle) => {
      if (cancelled) {
        handle?.destroy();
        return;
      }
      gpuRef.current = handle;
      setGpuActive(handle !== null);
    });

    return () => {
      cancelled = true;
      gpuRef.current?.destroy();
      gpuRef.current = null;
      setGpuActive(false);
    };
  }, [ready, gpuMarkers]);

  const visibleEvents = React.useMemo(
    () => events.filter((event) => layers[EVENT_LAYER[event.event_type]]),
    [events, layers]
  );

  useEffect(() => {
    if (!gpuActive) return;
    gpuRef.current?.update(visibleEvents, selectedEventId);
  }, [gpuActive, visibleEvents, selectedEventId]);

  /* -------------------------------------------- detections as DOM markers */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!maps) return;

    // When deck.gl is live it owns the detections; tear the DOM markers down
    // rather than drawing every point twice. If it never came up, this effect
    // keeps running and the map behaves exactly as it did before.
    if (gpuActive) {
      eventMarkers.current.forEach((marker) => marker.setMap(null));
      eventMarkers.current.clear();
      return;
    }

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
  }, [ready, events, layers, selectedEventId, gpuActive, onSelectBus, onSelectEvent]);

  /* ----------------------------------------------- first fit to the fleet */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || didFitRef.current || !buses.length) return;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!maps) return;

    const bounds = new maps.LatLngBounds();
    buses.forEach((bus) => bounds.extend({ lat: bus.latitude, lng: bus.longitude }));
    map.fitBounds(bounds, 80);
    didFitRef.current = true;
  }, [ready, buses]);

  /* ------------------------------------------------------ imperative API */
  const fitFleet = useCallback(() => {
    const map = mapRef.current;
    const maps = (window as any).google?.maps as typeof google.maps | undefined;
    if (!map || !maps || !busesRef.current.length) return;
    const bounds = new maps.LatLngBounds();
    busesRef.current.forEach((bus) => bounds.extend({ lat: bus.latitude, lng: bus.longitude }));
    map.fitBounds(bounds, 80);
  }, []);

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
          <div className="glass max-w-sm rounded-panel p-4">
            <p className="font-semibold text-ink">The map could not start.</p>
            <p className="mt-1 text-dim">{loadError}</p>
            <p className="mt-3 text-mini text-faint">
              Telemetry and detections keep arriving; only the basemap is missing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
