'use client';

import React from 'react';
import { DetectionEvent } from '@/types';
import { Layers } from 'lucide-react';

interface DeckGLOverlayProps {
  events: DetectionEvent[];
}

export const DeckGLOverlay: React.FC<DeckGLOverlayProps> = ({ events }) => {
  return (
    <div className="absolute top-3 right-3 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center gap-2 shadow-sm">
      <Layers className="h-4 w-4 text-blue-600 animate-pulse" />
      <span className="font-medium text-slate-700 dark:text-slate-200">
        WebGL Spatial Overlay: <span className="font-bold text-blue-600">{events.length} Points</span>
      </span>
    </div>
  );
};
