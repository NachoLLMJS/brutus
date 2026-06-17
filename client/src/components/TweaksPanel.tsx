// Panel de tweaks/settings flotante. Originalmente un dev tool de
// claude.ai/design — adoptado como settings reales del usuario, ancla en
// la esquina inferior derecha y permite collapsar/expandir.

import { useState, type ReactNode } from 'react';
import clsx from 'clsx';

export interface TweaksPanelProps {
  title?: string;
  /** Si se inicializa abierto. Default: false (collapsed). */
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function TweaksPanel({
  title = 'Tweaks',
  defaultOpen = false,
  children,
  className,
}: TweaksPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={clsx(
        'fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 font-display text-xs uppercase',
        'border-2 border-border-inner rounded',
        className,
      )}
      style={{
        background: 'var(--paper-dark)',
        boxShadow:
          '0 0 0 1px var(--border-outer) inset, 0 12px 28px rgba(0,0,0,0.6), 0 0 16px rgba(230, 180, 80, 0.15)',
        minWidth: open ? 200 : undefined,
        maxWidth: open ? 'min(280px, calc(100vw - 24px))' : undefined,
        maxHeight: open ? 'calc(100vh - 96px)' : undefined,
        overflowY: open ? 'auto' : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 cursor-pointer"
        style={{
          color: 'var(--accent-gold)',
          letterSpacing: '0.18em',
          borderBottom: open ? '1px solid var(--border-shadow)' : 'none',
        }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>⚙</span>
          {title}
        </span>
        <span aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="p-3 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

/* ───────────────── Sub-components ───────────────── */

export function TweakSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="text-[10px]"
        style={{
          color: 'var(--text-secondary)',
          letterSpacing: '0.22em',
          paddingBottom: 4,
          borderBottom: '1px dashed var(--border-shadow)',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export function TweakToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex items-center justify-between gap-3 cursor-pointer normal-case"
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        color: 'var(--text-strong)',
      }}
    >
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="relative shrink-0"
        style={{
          width: 36,
          height: 18,
          borderRadius: 9,
          background: value ? 'var(--accent-gold)' : 'var(--paper-accent)',
          border: '1px solid var(--border-outer)',
          boxShadow: value
            ? '0 0 8px rgba(230, 180, 80, 0.4)'
            : 'inset 0 1px 2px rgba(0,0,0,0.5)',
          transition: 'background 0.18s',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 1,
            left: value ? 19 : 1,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: value ? 'var(--paper-dark)' : 'var(--text-secondary)',
            transition: 'left 0.18s',
          }}
        />
      </button>
    </label>
  );
}

export function TweakSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label
      className="flex flex-col gap-1 normal-case"
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        color: 'var(--text-strong)',
      }}
    >
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span style={{ color: 'var(--accent-gold)' }}>{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cursor-pointer"
        style={{
          accentColor: 'var(--accent-gold)',
        }}
      />
    </label>
  );
}

export function TweakSelect<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: { label: string; value: V }[];
  onChange: (v: V) => void;
}) {
  return (
    <label
      className="flex flex-col gap-1 normal-case"
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        color: 'var(--text-strong)',
      }}
    >
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as V)}
        className="cursor-pointer"
        style={{
          background: 'var(--paper-dark)',
          color: 'var(--text-strong)',
          border: '1px solid var(--border-inner)',
          borderRadius: 3,
          padding: '4px 8px',
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
