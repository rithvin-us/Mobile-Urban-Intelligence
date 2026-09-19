'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import type {
  Bus,
  DetectionEvent,
  EventStatus,
  LayerKey,
  LayerState,
  MapOptionsState,
  MapStyleKey,
  SystemHealth,
} from '@/types';
import { fetchBuses, fetchEvents, fetchSystemHealth, updateEventStatus } from '@/lib/api';
import { EVENT_LAYER } from '@/lib/format';
import {
  averageResponseMinutes,
  buildClusters,
  busLookup,
  clusterFor,
  fleetCounts,
  fleetState,
  isOpen,
} from '@/lib/fleet';
import { ROUTES } from '@/lib/routes';
import { radarTileTemplate } from '@/lib/weather';
import { OpsMap, type MapHandle } from '@/components/map/ops_map';
import { BusCard } from '@/components/ops/bus_card';
import { EventCard } from '@/components/ops/event_card';
import { LeftPanel } from '@/components/ops/left_panel';
import { MapToolbar } from '@/components/ops/map_toolbar';
import {
  RightPanel,
  type SeverityFilter,
  type StatusFilter,
} from '@/components/ops/right_panel';
import { TopBar } from '@/components/ops/top_bar';

// The 3D twin pulls in a WebGL renderer, so it loads only when opened.
const BusTelemetryModal = dynamic(
  () => import('@/components/dashboard/bus_telemetry_modal').then((m) => m.BusTelemetryModal),
  { ssr: false }
);

const BUS_POLL_MS = 1000;
const EVENT_POLL_MS = 2000;
const HEALTH_POLL_MS = 5000;

const DEFAULT_LAYERS: LayerState = {
  buses: true,
  routes: true,
  defects: true,
  traffic: true,
  waterlogging: true,
  incidents: true,
  infrastructure: true,
};

const DEFAULT_OPTIONS: MapOptionsState = {
  trafficLayer: false,
  threeD: false,
  labels: true,
  weather: false,
};

export default function DashboardPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('streets');
  const [options, setOptions] = useState<MapOptionsState>(DEFAULT_OPTIONS);
  const [radarTemplate, setRadarTemplate] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');

  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [show3DModal, setShow3DModal] = useState<boolean>(false);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const mapRef = useRef<MapHandle | null>(null);


  /* ------------------------------------------------------------- polling */
  useEffect(() => {
    let alive = true;

    const loadBuses = async () => {
      const next = await fetchBuses();
      if (!alive) return;
      setBuses(next);
      setLastSync(Date.now());
    };
    const loadEvents = async () => {
      const next = await fetchEvents();
      if (alive) setEvents(next);
    };
    const loadHealth = async () => {
      const next = await fetchSystemHealth();
      if (alive) setHealth(next);
    };

    loadBuses();
    loadEvents();
    loadHealth();

    const busTimer = setInterval(loadBuses, BUS_POLL_MS);
    const eventTimer = setInterval(loadEvents, EVENT_POLL_MS);
    const healthTimer = setInterval(loadHealth, HEALTH_POLL_MS);
    const clockTimer = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      alive = false;
      clearInterval(busTimer);
      clearInterval(eventTimer);
      clearInterval(healthTimer);
      clearInterval(clockTimer);
    };
  }, []);

  useEffect(() => {
    radarTileTemplate().then(setRadarTemplate);
  }, []);

  // Narrow screens show the map alone; the panels open over it on demand, and
  // both fold away again whenever the window drops below the two-panel width.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const narrow = window.matchMedia('(max-width: 1023px)');
    const apply = (isNarrow: boolean) => {
      if (!isNarrow) return;
      setLeftCollapsed(true);
      setRightCollapsed(true);
    };

    apply(narrow.matches);
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    narrow.addEventListener('change', onChange);
    return () => narrow.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedBusId(null);
      setSelectedEventId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ------------------------------------------------------------- derived */
  const busById = useMemo(() => busLookup(buses), [buses]);
  const fleet = useMemo(() => fleetCounts(buses, now), [buses, now]);
  const clusters = useMemo(() => buildClusters(events), [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (statusFilter === 'OPEN' && !isOpen(event)) return false;
      if (statusFilter === 'ACKNOWLEDGED' && event.status !== 'ACKNOWLEDGED') return false;
      if (statusFilter === 'RESOLVED' && event.status !== 'RESOLVED') return false;
      if (severityFilter === 'HIGH_UP' && !['HIGH', 'CRITICAL'].includes(event.severity)) {
        return false;
      }
      return true;
    });
  }, [events, statusFilter, severityFilter]);

  const layerCounts = useMemo(() => {
    const counts: Record<LayerKey, number> = {
      buses: buses.length,
      routes: Object.keys(ROUTES).length,
      defects: 0,
      traffic: 0,
      waterlogging: 0,
      incidents: 0,
      infrastructure: 0,
    };
    for (const event of filteredEvents) {
      counts[EVENT_LAYER[event.event_type]] += 1;
    }
    return counts;
  }, [buses.length, filteredEvents]);

  const stats = useMemo(
    () => ({
      totalEvents: events.length,
      roadDefects: events.filter((event) => EVENT_LAYER[event.event_type] === 'defects').length,
      activeIncidents: events.filter(
        (event) => EVENT_LAYER[event.event_type] === 'incidents' && isOpen(event)
      ).length,
      avgResponseMinutes: averageResponseMinutes(events),
      activeBuses: buses.filter((bus) => fleetState(bus, now) !== 'OFFLINE').length,
    }),
    [events, buses, now]
  );

  const openDetections = useMemo(() => events.filter(isOpen).length, [events]);
  const criticalDetections = useMemo(
    () => events.filter((event) => event.severity === 'CRITICAL' && isOpen(event)).length,
    [events]
  );

  const selectedBus = selectedBusId ? busById.get(selectedBusId) ?? null : null;
  const selectedEvent = selectedEventId
    ? events.find((event) => event.id === selectedEventId) ?? null
    : null;

  const selectedBusEvents = useMemo(() => {
    if (!selectedBusId) return [];
    return events.filter((event) => event.bus_id === selectedBusId);
  }, [events, selectedBusId]);

  /* ------------------------------------------------------------ handlers */
  const selectBus = useCallback(
    (busId: string | null) => {
      setSelectedEventId(null);
      setSelectedBusId(busId);
      if (!busId) return;
      const bus = busById.get(busId);
      if (bus) mapRef.current?.panTo(bus.latitude, bus.longitude, 15);
    },
    [busById]
  );

  const selectEvent = useCallback(
    (eventId: string | null) => {
      setSelectedBusId(null);
      setSelectedEventId(eventId);
      if (!eventId) return;
      const event = events.find((item) => item.id === eventId);
      if (event) mapRef.current?.panTo(event.latitude, event.longitude, 16);
    },
    [events]
  );

  const handleLayerChange = useCallback((key: LayerKey, next: boolean) => {
    setLayers((current) => ({ ...current, [key]: next }));
  }, []);

  const handleOptionChange = useCallback((key: keyof MapOptionsState, next: boolean) => {
    setOptions((current) => ({ ...current, [key]: next }));
  }, []);

  const handleStatusChange = useCallback(
    async (eventId: string, status: EventStatus) => {
      setPendingEventId(eventId);
      // Show the decision straight away; the API result replaces it.
      setEvents((current) =>
        current.map((event) => (event.id === eventId ? { ...event, status } : event))
      );
      const updated = await updateEventStatus(eventId, status);
      if (updated) {
        setEvents((current) =>
          current.map((event) => (event.id === eventId ? { ...event, ...updated } : event))
        );
      } else {
        const fresh = await fetchEvents();
        setEvents(fresh);
      }
      setPendingEventId(null);
    },
    []
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas">
      <TopBar
        fleet={fleet}
        openDetections={openDetections}
        criticalDetections={criticalDetections}
        health={health}
        lastSync={lastSync}
        now={now}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        onToggleLeft={() => setLeftCollapsed((value) => !value)}
        onToggleRight={() => setRightCollapsed((value) => !value)}
        onFullscreen={() => mapRef.current?.toggleFullscreen()}
      />

      <div className="relative flex min-h-0 flex-1">
        <div
          className={
            leftCollapsed
              ? 'z-20 shrink-0'
              : 'absolute inset-y-0 left-0 z-20 lg:static lg:shrink-0'
          }
        >
          <LeftPanel
            collapsed={leftCollapsed}
            onToggleCollapsed={() => setLeftCollapsed((value) => !value)}
            layers={layers}
            layerCounts={layerCounts}
            onLayerChange={handleLayerChange}
            mapStyle={mapStyle}
            onMapStyleChange={setMapStyle}
            options={options}
            onOptionChange={handleOptionChange}
            radarAvailable={radarTemplate !== null}
            health={health}
            lastSync={lastSync}
            now={now}
          />
        </div>

        <main className="relative min-w-0 flex-1">
          <OpsMap
            ref={mapRef}
            buses={buses}
            events={filteredEvents}
            layers={layers}
            mapStyle={mapStyle}
            options={options}
            radarTemplate={radarTemplate}
            selectedBusId={selectedBusId}
            selectedEventId={selectedEventId}
            onSelectBus={selectBus}
            onSelectEvent={selectEvent}
          />

          <div className="pointer-events-none absolute inset-0">
            <MapToolbar
              mapStyle={mapStyle}
              onMapStyleChange={setMapStyle}
              options={options}
              onOptionChange={handleOptionChange}
              radarAvailable={radarTemplate !== null}
              onZoom={(delta) => mapRef.current?.zoomBy(delta)}
              onFitFleet={() => mapRef.current?.fitFleet()}
              onFullscreen={() => mapRef.current?.toggleFullscreen()}
            />

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end gap-2">
              {selectedBus && (
                <BusCard
                  bus={selectedBus}
                  events={selectedBusEvents}
                  now={now}
                  onClose={() => {
                    setSelectedBusId(null);
                    setShow3DModal(false);
                  }}
                  onCenter={() =>
                    mapRef.current?.panTo(selectedBus.latitude, selectedBus.longitude, 16)
                  }
                  onOpen3DView={() => setShow3DModal(true)}
                  onSelectEvent={selectEvent}
                />
              )}
              {selectedEvent && (
                <EventCard
                  event={selectedEvent}
                  reportingBus={busById.get(selectedEvent.bus_id)}
                  cluster={clusterFor(selectedEvent, clusters)}
                  pending={pendingEventId === selectedEvent.id}
                  now={now}
                  onClose={() => setSelectedEventId(null)}
                  onCenter={() =>
                    mapRef.current?.panTo(selectedEvent.latitude, selectedEvent.longitude, 17)
                  }
                  onStatusChange={(status) => handleStatusChange(selectedEvent.id, status)}
                  onSelectBus={selectBus}
                />
              )}
            </div>
          </div>
        </main>

        <div
          className={
            rightCollapsed
              ? 'z-20 shrink-0'
              : 'absolute inset-y-0 right-0 z-20 lg:static lg:shrink-0'
          }
        >
          <RightPanel
            collapsed={rightCollapsed}
            onToggleCollapsed={() => setRightCollapsed((value) => !value)}
            fleet={fleet}
            events={filteredEvents}
            busById={busById}
            selectedEventId={selectedEventId}
            onSelectEvent={selectEvent}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            severityFilter={severityFilter}
            onSeverityFilterChange={setSeverityFilter}
            stats={stats}
            now={now}
          />
        </div>
      </div>

      {/* Interactive 3D WebGL Bharat Bus & Sensor Viewer Modal */}
      {show3DModal && selectedBus && (
        <BusTelemetryModal
          bus={selectedBus}
          events={events}
          onClose={() => setShow3DModal(false)}
        />
      )}
    </div>
  );
}

