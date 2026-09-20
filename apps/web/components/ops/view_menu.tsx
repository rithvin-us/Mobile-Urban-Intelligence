'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Eye, RotateCcw } from 'lucide-react';

import { CHROME_LABELS, type ChromeState } from '@/lib/view_prefs';
import { Track } from '@/components/ops/primitives';
import { cn } from '@/lib/utils';

interface ViewMenuProps {
  chrome: ChromeState;
  onToggle: (key: keyof ChromeState) => void;
  onClearAll: () => void;
  onRestoreAll: () => void;
}

const ORDER: (keyof ChromeState)[] = [
  'controls',
  'intelligence',
  'quickFilters',
  'mapControls',
  'alerts',
  'detailCards',
  'legend',
];

/** Single place to switch any piece of console chrome on or off. */
export function ViewMenu({ chrome, onToggle, onClearAll, onRestoreAll }: ViewMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hiddenCount = ORDER.filter((key) => !chrome[key]).length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Choose what shows on the map"
        title="Choose what shows on the map (V)"
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-mini transition-colors',
          open || hiddenCount > 0
            ? 'border-accent-line bg-accent-soft text-ink'
            : 'border-line-soft bg-raised text-dim hover:text-ink'
        )}
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">View</span>
        {hiddenCount > 0 && (
          <span className="tnum font-mono text-micro text-accent">{hiddenCount} off</span>
        )}
      </button>

      {open && (
        <div className="glass panel-enter absolute right-0 top-[calc(100%+6px)] z-50 w-[224px] overflow-hidden rounded-panel">
          <div className="border-b border-line px-3 py-2 text-mini text-dim">
            Show on the map
          </div>
          <div className="p-1">
            {ORDER.map((key) => (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={chrome[key]}
                onClick={() => onToggle(key)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-left transition-colors hover:bg-hover/60"
              >
                <Track checked={chrome[key]} />
                <span className={chrome[key] ? 'text-ink' : 'text-dim'}>{CHROME_LABELS[key]}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-1 border-t border-line p-1.5">
            <button
              type="button"
              onClick={onClearAll}
              className="flex-1 rounded-md px-2 py-1.5 text-mini text-dim transition-colors hover:bg-hover/60 hover:text-ink"
            >
              Map only
            </button>
            <button
              type="button"
              onClick={onRestoreAll}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-mini text-dim transition-colors hover:bg-hover/60 hover:text-ink"
            >
              <RotateCcw className="h-3 w-3" />
              Show all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
