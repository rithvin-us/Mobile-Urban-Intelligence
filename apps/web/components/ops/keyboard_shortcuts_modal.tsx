'use client';

import React from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'Map',
    keys: [
      ['F', 'Fit the whole fleet'],
      ['L', 'Cycle basemap'],
      ['3', 'Tilt to 3D'],
      ['R', 'Rain radar'],
      ['G', 'GPU markers'],
    ],
  },
  {
    title: 'Console',
    keys: [
      ['[', 'Controls panel'],
      [']', 'Intelligence panel'],
      ['V', 'Hide every overlay'],
      ['T', 'Night / daylight theme'],
      ['D', 'Scripted demo fleet'],
    ],
  },
  {
    title: 'Selection',
    keys: [
      ['Esc', 'Clear the selection'],
      ['?', 'This list'],
    ],
  },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass panel-enter w-full max-w-md overflow-hidden rounded-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-semibold text-ink">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-hover/60 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-1.5 text-mini font-semibold text-dim">{group.title}</div>
              <ul className="space-y-1">
                {group.keys.map(([key, description]) => (
                  <li key={key} className="flex items-baseline gap-2">
                    <kbd className="tnum min-w-[22px] rounded border border-line bg-raised px-1.5 py-0.5 text-center font-mono text-micro text-ink">
                      {key}
                    </kbd>
                    <span className="text-mini text-dim">{description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="border-t border-line px-4 py-2.5 text-micro text-faint">
          Shortcuts are ignored while a text field has focus.
        </p>
      </div>
    </div>
  );
}
