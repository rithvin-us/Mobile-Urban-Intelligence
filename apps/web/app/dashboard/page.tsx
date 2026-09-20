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
import { DemoEngine } from '@/lib/demo_engine';
import { useChrome } from '@/lib/view_prefs';
import { OpsMap, type MapHandle } from '@/components/map/ops_map';
import { TopBar } from '@/components/ops/top_bar';
import { BusCard } from '@/components/ops/bus_card';
import { EventCard } from '@/components/ops/event_card';
import { QuickFilterBar } from '@/components/ops/quick_filter_bar';
import { CriticalAlertBanner } from '@/components/ops/critical_alert_banner';
import { KeyboardShortcutsModal } from '@/components/ops/keyboard_shortcuts_modal';
import { LeftPanel } from '@/components/ops/left_panel';
import { MarkerLegend } from '@/components/ops/marker_legend';
import { MapControlBar, MapZoomRail } from '@/components/ops/map_toolbar';
import {
  RightPanel,
  type SeverityFilter,
  type StatusFilter,
} from '@/components/ops/right_panel';

// The 3D twin pulls in a WebGL renderer, so it loads only when opened.
const BusTelemetryModal = dynamic(
  () => import('@/components/dashboard/bus_telemetry_modal').then((m) => m.BusTelemetryModal),
  { ssr: false }
);

const BUS_POLL_MS = 1000;
const EVENT_POLL_MS = 2000;
const HEALTH_POLL_MS = 5000;
const DEMO_TICK_MS = 700;

/** Consecutive failed polls before the console offers the scripted fleet instead. */
const FAILED_POLLS_BEFORE_DEMO = 3;

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
  const [gpuMarkers, setGpuMarkers] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');

  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [show3DModal, setShow3DModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const [quickCriticalOnly, setQuickCriticalOnly] = useState(false);
  const [quickActiveOnly, setQuickActiveOnly] = useState(false);

  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [demoMode, setDemoMode] = useState(false);
  const [autoDemo, setAutoDemo] = useState(false);

  const { chrome, toggle: toggleChrome, set: setChrome, clearAll, restoreAll } = useChrome();

  const mapRef = useRef<MapHandle | null>(null);
  const demoRef = useRef<DemoEngine | null>(null);
  const failedPollsRef = useRef(0);

  const latestCriticalEvent = useMemo(() => {
    const criticals = events.filter(
      (e) => (e.severity === 'CRITICAL' || e.severity === 'HIGH') && e.status !== 'RESOLVED'
    );
    if (criticals.length === 0) return null;
    const latest = criticals[0];
    if (dismissedAlertId === latest.id) return null;
    return latest;
  }, [events, dismissedAlertId]);

  /* ------------------------------------------------------ demo preference */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1' || localStorage.getItem('urban_demo') === '1') {
      setDemoMode(true);
    }
  }, []);

  /* ------------------------------------------------------------- polling */
  useEffect(() => {
    if (demoMode) return;

    let alive = true;

    const loadBuses = async () => {
      const next = await fetchBuses();
      if (!alive) return;
      if (!next) {
        failedPollsRef.current += 1;
        // A backend that cannot be reached should not leave a blank console.
        // After a few failed polls, fall through to the scripted fleet and say so.
        if (failedPollsRef.current >= FAILED_POLLS_BEFORE_DEMO) {
          setAutoDemo(true);
          setDemoMode(true);
        }
        return;
      }
      failedPollsRef.current = 0;
      setBuses(next);
      setLastSync(Date.now());
    };
    const loadEvents = async () => {
      const next = await fetchEvents();
      if (alive && next) setEvents(next);
    };
    const loadHealth = async () => {
      const next = await fetchSystemHealth();
      if (alive && next) setHealth(next);
    };

    loadBuses();
    loadEvents();
    loadHealth();

    const busTimer = setInterval(loadBuses, BUS_POLL_MS);
    const eventTimer = setInterval(loadEvents, EVENT_POLL_MS);
    const healthTimer = setInterval(loadHealth, HEALTH_POLL_MS);

    return () => {
      alive = false;
      clearInterval(busTimer);
      clearInterval(eventTimer);
      clearInterval(healthTimer);
    };
  }, [demoMode]);

  /* ---------------------------------------------------- scripted demo feed */
  useEffect(() => {
    if (!demoMode) return;

    if (!demoRef.current) demoRef.current = new DemoEngine();
    const engine = demoRef.current;

    const tick = () => {
      const sample = engine.sample();
      setBuses(sample.buses);
      setEvents([...sample.events]);
      setHealth(sample.health);
      setLastSync(Date.now());
    };

    tick();
    const timer = setInterval(tick, DEMO_TICK_MS);
    return () => clearInterval(timer);
  }, [demoMode]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    radarTileTemplate().then(setRadarTemplate);
  }, []);

  // Narrow screens show the map alone; the panels open over it on demand.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const narrow = window.matchMedia('(max-width: 1023px)');
    const apply = (isNarrow: boolean) => {
      if (!isNarrow) return;
      setChrome('controls', false);
      setChrome('intelligence', false);
    };
    apply(narrow.matches);
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    narrow.addEventListener('change', onChange);
    return () => narrow.removeEventListener('change', onChange);
  }, [setChrome]);

  /* ------------------------------------------------------ theme & shortcuts */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('urban_theme') as 'dark' | 'light' | null;
    if (stored === 'dark' || stored === 'light') setThemeMode(stored);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('light', themeMode === 'light');
    root.classList.toggle('dark', themeMode === 'dark');
    localStorage.setItem('urban_theme', themeMode);
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleDemo = useCallback(() => {
    setDemoMode((prev) => {
      const next = !prev;
      failedPollsRef.current = 0;
      if (!next) setAutoDemo(false);
      try {
        localStorage.setItem('urban_demo', next ? '1' : '0');
      } catch {
        /* preference is optional */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          (active as HTMLElement).isContentEditable);

      if (event.key === 'Escape') {
        setSelectedBusId(null);
        setSelectedEventId(null);
        setShowShortcutsModal(false);
        return;
      }
      if (isInput || event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case '?':
          event.preventDefault();
          setShowShortcutsModal((prev) => !prev);
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          mapRef.current?.fitFleet();
          break;
        case '3':
          event.preventDefault();
          setOptions((prev) => ({ ...prev, threeD: !prev.threeD }));
          break;
        case 'l':
        case 'L':
          event.preventDefault();
          setMapStyle((s) =>
            s === 'streets' ? 'satellite' : s === 'satellite' ? 'hybrid' : 'streets'
          );
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          setOptions((prev) => ({ ...prev, weather: !prev.weather }));
          break;
        case 't':
        case 'T':
          event.preventDefault();
          toggleTheme();
          break;
        case 'd':
        case 'D':
          event.preventDefault();
          toggleDemo();
          break;
        case '[':
          event.preventDefault();
          toggleChrome('controls');
          break;
        case ']':
          event.preventDefault();
          toggleChrome('intelligence');
          break;
        case 'v':
        case 'V':
          event.preventDefault();
          clearAll();
          break;
        case 'g':
        case 'G':
          event.preventDefault();
          setGpuMarkers((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleTheme, toggleDemo, toggleChrome, clearAll]);

  /* ------------------------------------------------------------- derived */
  const busById = useMemo(() => busLookup(buses), [buses]);
  const fleet = useMemo(() => fleetCounts(buses, now), [buses, now]);
  const clusters = useMemo(() => buildClusters(events), [events]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (statusFilter === 'OPEN' && !isOpen(event)) return false;
        if (statusFilter === 'ACKNOWLEDGED' && event.status !== 'ACKNOWLEDGED') return false;
        if (statusFilter === 'RESOLVED' && event.status !== 'RESOLVED') return false;
        if (severityFilter === 'HIGH_UP' && !['HIGH', 'CRITICAL'].includes(event.severity)) {
          return false;
        }
        return true;
      }),
    [events, statusFilter, severityFilter]
  );

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
    for (const event of filteredEvents) counts[EVENT_LAYER[event.event_type]] += 1;
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

  const selectedBusEvents = useMemo(
    () => (selectedBusId ? events.filter((event) => event.bus_id === selectedBusId) : []),
    [events, selectedBusId]
  );

  /* ------------------------------------------------------------ handlers */
  const busByIdRef = useRef(busById);
  busByIdRef.current = busById;

  const selectBus = useCallback((busId: string | null) => {
    setSelectedEventId(null);
    setSelectedBusId(busId);
    if (!busId) return;
    const bus = busByIdRef.current.get(busId);
    if (bus) mapRef.current?.panTo(bus.latitude, bus.longitude, 15);
  }, []);

  // Reading the latest events through a ref keeps these handlers stable. A new
  // function identity every poll would tear down and rebuild the map's marker
  // layers once a second, which freezes the tab.
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const selectEvent = useCallback((eventId: string | null) => {
    setSelectedBusId(null);
    setSelectedEventId(eventId);
    if (!eventId) return;
    const event = eventsRef.current.find((item) => item.id === eventId);
    if (event) mapRef.current?.panTo(event.latitude, event.longitude, 16);
  }, []);

  const handleLayerChange = useCallback((key: LayerKey, next: boolean) => {
    setLayers((current) => ({ ...current, [key]: next }));
  }, []);

  const handleAllLayers = useCallback((next: boolean) => {
    setLayers({
      buses: next,
      routes: next,
      defects: next,
      traffic: next,
      waterlogging: next,
      incidents: next,
      infrastructure: next,
    });
  }, []);

  const handleOptionChange = useCallback((key: keyof MapOptionsState, next: boolean) => {
    setOptions((current) => ({ ...current, [key]: next }));
  }, []);

  const handleStatusChange = useCallback(
    async (eventId: string, status: EventStatus) => {
      setPendingEventId(eventId);
      // Show the decision straight away; the authoritative result replaces it.
      setEvents((current) =>
        current.map((event) => (event.id === eventId ? { ...event, status } : event))
      );

      if (demoMode) {
        demoRef.current?.setStatus(eventId, status);
        setPendingEventId(null);
        return;
      }

      const updated = await updateEventStatus(eventId, status);
      if (updated) {
        setEvents((current) =>
          current.map((event) => (event.id === eventId ? { ...event, ...updated } : event))
        );
      } else {
        const fresh = await fetchEvents();
        setEvents(fresh ?? []);
      }
      setPendingEventId(null);
    },
    [demoMode]
  );

  const sourceLabel = demoMode
    ? autoDemo
      ? 'scripted fleet · API unreachable'
      : 'scripted fleet'
    : lastSync
    ? 'live telemetry'
    : 'connecting';

  return (
    <div className="relative h-screen w-full overflow-hidden bg-canvas">
      <OpsMap
        ref={mapRef}
        buses={buses}
        events={filteredEvents}
        layers={layers}
        mapStyle={mapStyle}
        options={options}
        themeMode={themeMode}
        radarTemplate={radarTemplate}
        selectedBusId={selectedBusId}
        selectedEventId={selectedEventId}
        gpuMarkers={gpuMarkers}
        onSelectBus={selectBus}
        onSelectEvent={selectEvent}
      />

      {/*
        Every overlay lives inside one flex tree rather than as absolutely
        positioned siblings. Two panels can no longer be told to occupy the same
        corner, so nothing can cover a control the operator needs.
      */}
      <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3">
        {chrome.header && (
          <TopBar
            fleet={fleet}
            openDetections={openDetections}
            criticalDetections={criticalDetections}
            health={health}
            lastSync={lastSync}
            now={now}
            chrome={chrome}
            onToggleChrome={toggleChrome}
            onClearChrome={clearAll}
            onRestoreChrome={restoreAll}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            onFullscreen={() => mapRef.current?.toggleFullscreen()}
            demoMode={demoMode}
            onToggleDemo={toggleDemo}
            sourceLabel={sourceLabel}
          />
        )}

        <div className="flex min-h-0 flex-1 gap-3">
          {chrome.controls && (
            <LeftPanel
              onClose={() => toggleChrome('controls')}
              layers={layers}
              layerCounts={layerCounts}
              onLayerChange={handleLayerChange}
              onAllLayers={handleAllLayers}
              mapStyle={mapStyle}
              onMapStyleChange={setMapStyle}
              options={options}
              onOptionChange={handleOptionChange}
              radarAvailable={radarTemplate !== null}
              gpuMarkers={gpuMarkers}
              onGpuMarkersChange={setGpuMarkers}
              health={health}
              lastSync={lastSync}
              now={now}
            />
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-start gap-3">
              {chrome.quickFilters && (
                <QuickFilterBar
                  criticalOnly={quickCriticalOnly}
                  activeOnly={quickActiveOnly}
                  weatherOnly={options.weather}
                  onToggleCriticalOnly={() => {
                    setQuickCriticalOnly((prev) => {
                      setSeverityFilter(!prev ? 'HIGH_UP' : 'ALL');
                      return !prev;
                    });
                  }}
                  onToggleActiveOnly={() => {
                    setQuickActiveOnly((prev) => {
                      setStatusFilter(!prev ? 'OPEN' : 'ALL');
                      return !prev;
                    });
                  }}
                  onToggleWeatherOnly={() =>
                    setOptions((prev) => ({ ...prev, weather: !prev.weather }))
                  }
                  onResetFilters={() => {
                    setQuickCriticalOnly(false);
                    setQuickActiveOnly(false);
                    setSeverityFilter('ALL');
                    setStatusFilter('ALL');
                    setOptions((prev) => ({ ...prev, weather: false }));
                  }}
                />
              )}

              <div className="min-w-0 flex-1" />

              {chrome.alerts && latestCriticalEvent && (
                <div className="w-full max-w-[420px] shrink">
                  <CriticalAlertBanner
                    criticalEvent={latestCriticalEvent}
                    reportingBus={busById.get(latestCriticalEvent.bus_id)}
                    now={now}
                    onLocate={(event) => selectEvent(event.id)}
                    onDismiss={() => setDismissedAlertId(latestCriticalEvent.id)}
                  />
                </div>
              )}

              {chrome.mapControls && (
                <MapZoomRail
                  onZoom={(delta) => mapRef.current?.zoomBy(delta)}
                  onFitFleet={() => mapRef.current?.fitFleet()}
                  onFullscreen={() => mapRef.current?.toggleFullscreen()}
                />
              )}
            </div>

            <div className="min-h-0 flex-1" />

            <div className="flex flex-wrap items-end gap-3">
              {chrome.mapControls && (
                <MapControlBar
                  mapStyle={mapStyle}
                  onMapStyleChange={setMapStyle}
                  options={options}
                  onOptionChange={handleOptionChange}
                  radarAvailable={radarTemplate !== null}
                />
              )}

              {chrome.detailCards && selectedBus && (
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

              {chrome.detailCards && selectedEvent && (
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
                  onStatusChange={(status: EventStatus) =>
                    handleStatusChange(selectedEvent.id, status)
                  }
                  onSelectBus={selectBus}
                />
              )}

              <div className="min-w-0 flex-1" />

              {chrome.legend && <MarkerLegend layers={layers} />}
            </div>
          </div>

          {chrome.intelligence && (
            <RightPanel
              onClose={() => toggleChrome('intelligence')}
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
          )}
        </div>
      </div>

      {show3DModal && selectedBus && (
        <BusTelemetryModal
          bus={selectedBus}
          events={events}
          onClose={() => setShow3DModal(false)}
        />
      )}

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
