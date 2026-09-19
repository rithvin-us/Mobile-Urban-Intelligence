'use client';

import React, { useState, useEffect } from 'react';
import { Bus, DetectionEvent, DashboardStats } from '@/types';
import { fetchBuses, fetchEvents } from '@/lib/api';
import { StatCards } from '@/components/dashboard/stat_cards';
import { RecentEvents } from '@/components/dashboard/recent_events';
import { AnalyticsCharts } from '@/components/dashboard/analytics_charts';
import { GoogleMapView } from '@/components/map/google_map';

export default function DashboardPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [fetchedBuses, fetchedEvents] = await Promise.all([
        fetchBuses(),
        fetchEvents()
      ]);
      setBuses(fetchedBuses);
      setEvents(fetchedEvents);
    } catch (err) {
      console.error("Error updating dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll telemetry and events every 3 seconds for live dashboard updates
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Compute stat counters
  const activeBusesCount = buses.filter(b => b.status === 'ACTIVE').length;
  const roadDefectsCount = events.filter(e => 
    ['POTHOLE', 'ROAD_DAMAGE', 'WATERLOGGING'].includes(e.event_type)
  ).length;
  const activeIncidentsCount = events.filter(e => 
    ['INCIDENT', 'PEDESTRIAN_RISK', 'TRAFFIC'].includes(e.event_type) && e.status !== 'RESOLVED'
  ).length;

  const stats: DashboardStats = {
    totalBuses: buses.length,
    activeBuses: activeBusesCount,
    eventsToday: events.length,
    roadDefects: roadDefectsCount,
    activeIncidents: activeIncidentsCount
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <StatCards stats={stats} />

      {/* Main Grid: Live Map + Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GoogleMapView buses={buses} events={events} />
        </div>
        <div className="lg:col-span-1">
          <RecentEvents events={events} />
        </div>
      </div>

      {/* Analytics Breakdown */}
      <AnalyticsCharts events={events} />
    </div>
  );
}
