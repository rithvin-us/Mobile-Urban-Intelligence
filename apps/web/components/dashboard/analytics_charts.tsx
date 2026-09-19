'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DetectionEvent } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface AnalyticsChartsProps {
  events: DetectionEvent[];
}

const SEVERITY_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444'
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ events }) => {
  // Aggregate events by type
  const typeCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0
  };

  events.forEach((ev) => {
    typeCounts[ev.event_type] = (typeCounts[ev.event_type] || 0) + 1;
    if (severityCounts[ev.severity] !== undefined) {
      severityCounts[ev.severity] += 1;
    }
  });

  const barData = Object.keys(typeCounts).map((type) => ({
    name: type.replace('_', ' '),
    count: typeCounts[type]
  }));

  const pieData = Object.keys(severityCounts).map((severity) => ({
    name: severity,
    value: severityCounts[severity]
  })).filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Detection Breakdown by Type
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-4">
          {barData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No detection data to display
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            Event Severity Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-4">
          {pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No severity data to display
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
