'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared console parts. Everything floating on the map uses `FloatingPanel` so
 * blur, hairline and shadow stay identical across the console; anything that
 * looks different here is meant to.
 */

/** Section heading inside a panel. Sentence case, no tracked-out label chrome. */
export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 pb-1.5 pt-3">
      <h2 className="text-mini font-semibold text-dim">{children}</h2>
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

/** A labelled switch row: the whole row is the hit area, the track shows state. */
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
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-hover/60'
      )}
    >
      <Track checked={checked} />
      {color && <Dot color={color} className={checked ? '' : 'opacity-30'} />}
      <span className={cn('flex-1 truncate', checked ? 'text-ink' : 'text-dim')}>{label}</span>
      {typeof count === 'number' && (
        <span className="tnum font-mono text-mini text-faint">{count}</span>
      )}
    </button>
  );
}

/** The switch track on its own, for rows that are not a full-width button. */
export function Track({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'relative h-[15px] w-[26px] shrink-0 rounded-full border transition-colors',
        checked ? 'border-accent-line bg-accent-soft' : 'border-line bg-raised'
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] h-[9px] w-[9px] rounded-full transition-all duration-150',
          checked ? 'left-[14px] bg-accent' : 'left-[3px] bg-faint'
        )}
      />
    </span>
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
    <div
      className={cn(
        'flex gap-0.5 rounded-lg border border-line-soft bg-raised p-0.5',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-[6px] px-2.5 py-[4px] text-mini transition-colors',
              active
                ? 'bg-accent-soft font-semibold text-ink shadow-[inset_0_0_0_1px_var(--accent-line)]'
                : 'text-dim hover:bg-hover/60 hover:text-ink'
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
      <span className="shrink-0 text-mini text-faint">{label}</span>
      <span className={cn('truncate text-right', mono && 'tnum font-mono text-sm', tone ?? 'text-ink')}>
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
    neutral: 'border-line bg-raised text-dim hover:border-accent-line hover:text-ink',
    primary: 'border-accent-line bg-accent-soft text-ink hover:brightness-110',
    ok: 'border-[color:var(--ok)]/40 bg-[color:var(--ok)]/12 text-ok hover:bg-[color:var(--ok)]/20',
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex-1 rounded-lg border px-2 py-[6px] text-mini font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40',
        tones[tone]
      )}
    >
      {children}
    </button>
  );
}

/** Floating glass panel shell. Every surface above the map uses this. */
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
        'glass panel-enter pointer-events-auto overflow-hidden rounded-panel',
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
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  accent?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 border-b border-line px-3 py-2.5">
      {accent && <Dot color={accent} className="mt-[7px]" />}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink">{title}</div>
        {subtitle && <div className="truncate text-mini text-faint">{subtitle}</div>}
      </div>
      {actions}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="-mr-1 rounded p-1 text-faint transition-colors hover:bg-hover/60 hover:text-ink"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
            <path
              d="M1 1l10 10M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/** Square icon control used in the map rails and the header. */
export function IconButton({
  label,
  onClick,
  active = false,
  disabled = false,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg border transition-all',
        disabled
          ? 'cursor-not-allowed border-line-soft bg-raised text-faint opacity-40'
          : active
          ? 'border-accent-line bg-accent-soft text-accent'
          : 'border-line-soft bg-raised text-dim hover:bg-hover/70 hover:text-ink',
        className
      )}
    >
      {children}
    </button>
  );
}
