import React from 'react';
import { Bus, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md">
            <Bus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              UrbanIntelligence <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold dark:bg-blue-900 dark:text-blue-200">SIH26124</span>
            </h1>
            <p className="text-xs text-slate-500">Public Transport Fleet Sensing & City Infrastructure Platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400">
            <Activity className="h-4 w-4 animate-pulse" />
            <span className="font-medium">Live Telemetry Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};
