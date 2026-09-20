'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Which pieces of console chrome are on screen.
 *
 * Every overlay is switchable, so an operator can strip the console back to the
 * map alone — and a recording can show one thing at a time without anything
 * else competing for attention.
 */
export interface ChromeState {
  header: boolean;
  controls: boolean;
  intelligence: boolean;
  quickFilters: boolean;
  mapControls: boolean;
  alerts: boolean;
  legend: boolean;
  detailCards: boolean;
}

export const CHROME_DEFAULTS: ChromeState = {
  header: true,
  controls: true,
  intelligence: true,
  quickFilters: true,
  mapControls: true,
  alerts: true,
  legend: true,
  detailCards: true,
};

export const CHROME_LABELS: Record<keyof ChromeState, string> = {
  header: 'Status bar',
  controls: 'Controls panel',
  intelligence: 'Intelligence panel',
  quickFilters: 'Quick filters',
  mapControls: 'Map controls',
  alerts: 'Critical alerts',
  legend: 'Marker legend',
  detailCards: 'Detail cards',
};

const STORAGE_KEY = 'urban_chrome_v2';

export function useChrome() {
  const [chrome, setChrome] = useState<ChromeState>(CHROME_DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChrome({ ...CHROME_DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // A blocked or corrupt store just means the console opens in its default layout.
    }
  }, []);

  const toggle = useCallback((key: keyof ChromeState) => {
    setChrome((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* preference is optional */
      }
      return next;
    });
  }, []);

  const set = useCallback((key: keyof ChromeState, value: boolean) => {
    setChrome((current) => {
      if (current[key] === value) return current;
      const next = { ...current, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* preference is optional */
      }
      return next;
    });
  }, []);

  /** Hides every overlay at once, leaving the bare map. */
  const clearAll = useCallback(() => {
    const next: ChromeState = {
      header: true,
      controls: false,
      intelligence: false,
      quickFilters: false,
      mapControls: false,
      alerts: false,
      legend: false,
      detailCards: false,
    };
    setChrome(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* preference is optional */
    }
  }, []);

  const restoreAll = useCallback(() => {
    setChrome(CHROME_DEFAULTS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(CHROME_DEFAULTS));
    } catch {
      /* preference is optional */
    }
  }, []);

  return { chrome, toggle, set, clearAll, restoreAll };
}
