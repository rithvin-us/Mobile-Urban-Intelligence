import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats } from '@/types';
import { Bus, Activity, AlertOctagon, Construction, ShieldAlert } from 'lucide-react';

interface StatCardsProps {
  stats: DashboardStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <Bus className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Buses</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalBuses}</h3>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Buses</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeBuses}</h3>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Events Today</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.eventsToday}</h3>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 rounded-lg text-amber-600 dark:bg-amber-900 dark:text-amber-300">
            <Construction className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Road Defects</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.roadDefects}</h3>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-rose-100 rounded-lg text-rose-600 dark:bg-rose-900 dark:text-rose-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Incidents</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeIncidents}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
