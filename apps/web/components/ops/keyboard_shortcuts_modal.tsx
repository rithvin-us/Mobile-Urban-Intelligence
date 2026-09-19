'use client';

import React from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'T', action: 'Toggle light / dark executive theme mode' },
    { key: 'F', action: 'Fit map to active fleet coordinates' },
    { key: '3', action: 'Toggle 3D tilt view (satellite basemap)' },
    { key: 'L', action: 'Cycle basemaps (Streets / Satellite / Hybrid)' },
    { key: 'C', action: 'Inspect verified municipal defect clusters' },
    { key: 'R', action: 'Toggle precipitation radar overlay' },
    { key: 'Esc', action: 'Clear selection / Close active modal' },
    { key: '?', action: 'Toggle keyboard shortcuts helper' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-panel border border-line rounded-xl shadow-2xl p-5 text-ink">
        <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-bold">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-faint hover:text-ink transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between text-xs py-1 border-b border-line-soft last:border-0">
              <span className="text-dim">{s.action}</span>
              <kbd className="px-2 py-0.5 rounded bg-canvas border border-line font-mono font-bold text-ink">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-line text-center text-[11px] text-faint">
          Press <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-line font-mono text-ink">?</kbd> anytime to toggle shortcuts
        </div>
      </div>
    </div>
  );
}
