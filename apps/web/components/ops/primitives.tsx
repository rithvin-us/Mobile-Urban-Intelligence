'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/** Section heading inside a side panel. */
export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 pb-1.5 pt-3">
      <h2 className="text-[11px] font-semibold tracking-wide text-dim">{children}</h2>
      {right}
    </div>
  );
}

/** Small coloured dot used for layer keys and health states. */
export function Dot({
  color,
  pulse = false,
  className,
}: {
  color: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-[7px] w-[7px] rounded-full', pulse && 'pulse-dot', className)}
      style={{ backgroundColor: color }}
    />
  );
}

/** A labelled switch row: the label is the hit area, the track shows state. */
export function SwitchRow({
  label,
  checked,
  onChange,
  color,
  disabled = false,
  hint,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  color?: string;
  disabled?: boolean;
  hint?: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      title={hint}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-[6px] text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-hover'
      )}
    >
      <span
        className={cn(
          'relative h-[14px] w-[24px] shrink-0 rounded-full border transition-colors',
          checked ? 'border-accent-line bg-accent-soft' : 'border-line bg-raised'
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-[8px] w-[8px] rounded-full transition-all',
            checked ? 'left-[13px] bg-accent' : 'left-[3px] bg-faint'
          )}
        />
      </span>
      {color && <Dot color={color} className={checked ? '' : 'opacity-35'} />}
      <span className={cn('flex-1 truncate', checked ? 'text-ink' : 'text-dim')}>{label}</span>
      {typeof count === 'number' && (
        <span className="tnum font-mono text-[11px] text-faint">{count}</span>
      )}
    </button>
  );
}

/** Segmented control for mutually exclusive choices such as basemap style. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex border border-line/80 bg-panel/80 backdrop-blur-md rounded-lg overflow-hidden shadow-sm', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 px-2.5 py-[5px] text-[11px] transition-colors',
              active ? 'bg-accent-soft/90 text-ink font-semibold' : 'text-dim hover:bg-hover/80 hover:text-ink'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Compact key/value row used across the telemetry and detail panels. */
export function DataRow({
  label,
  value,
  tone,
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-[5px]">
      <span className="shrink-0 text-[11px] text-faint">{label}</span>
      <span className={cn('truncate text-right', mono && 'tnum font-mono text-[12px]', tone ?? 'text-ink')}>
        {value}
      </span>
    </div>
  );
}

/** Action button for operator decisions. */
export function ActionButton({
  children,
  onClick,
  tone = 'neutral',
  disabled = false,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'neutral' | 'primary' | 'ok';
  disabled?: boolean;
  title?: string;
}) {
  const tones = {
    neutral: 'border-line bg-raised/80 text-dim hover:border-accent-line hover:text-ink',
    primary: 'border-accent-line bg-accent-soft/90 text-ink hover:bg-accent-soft',
    ok: 'border-emerald-500/40 bg-emerald-950/40 text-ok hover:bg-emerald-950/60',
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex-1 border px-2 py-[6px] text-[11px] transition-colors rounded disabled:cursor-not-allowed disabled:opacity-40',
        tones[tone]
      )}
    >
      {children}
    </button>
  );
}

/** Floating panel shell for the bus and event detail cards. */
export function FloatingPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'pointer-events-auto w-[275px] rounded-xl border border-line/80 bg-panel/80 shadow-2xl backdrop-blur-md overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  onClose,
  accent,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  accent?: string;
}) {
  return (
    <div className="flex items-start gap-2 border-b border-line px-3 py-2">
      {accent && <Dot color={accent} className="mt-[6px]" />}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">{title}</div>
        {subtitle && <div className="truncate text-[11px] text-faint">{subtitle}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="-mr-1 px-1 text-faint transition-colors hover:text-ink"
        >
          ×
        </button>
      )}
    </div>
  );
}
