import clsx from 'clsx';
import { pct } from '@/lib/format';

interface HPBarProps {
  value: number;
  max: number;
  label?: string;
  className?: string;
}

export function HPBar({ value, max, label, className }: HPBarProps) {
  const p = pct(value, max);
  const low = p < 30;
  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <div className="flex justify-between text-xs text-muted mb-1 font-sans">
          <span>{label}</span>
          <span>
            {Math.max(0, Math.round(value))} / {max}
          </span>
        </div>
      )}
      <div
        className="h-3 w-full rounded bg-deep border border-arcane overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.max(0, Math.round(value))}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={clsx('h-full transition-all duration-300', low ? 'bg-hp-low' : 'bg-hp-full')}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}
