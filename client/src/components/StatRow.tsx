import clsx from 'clsx';
import { pct } from '@/lib/format';
import { STAT_ICONS, type StatKey } from '@/lib/assets';

interface StatRowProps {
  label: string;
  icon?: string;
  statKey?: StatKey;
  value: number;
  max?: number;
  className?: string;
}

export function StatRow({ label, icon, statKey, value, max = 50, className }: StatRowProps) {
  const p = pct(value, max);
  const iconSrc = statKey ? STAT_ICONS[statKey] : undefined;
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div className="w-28 flex items-center gap-2 text-sm text-muted font-sans">
        {iconSrc ? (
          <img src={iconSrc} alt="" className="w-4 h-4 object-contain" />
        ) : icon ? (
          <span aria-hidden>{icon}</span>
        ) : null}
        <span>{label}</span>
      </div>
      <div className="flex-1 h-2 rounded bg-deep border border-arcane overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-rune to-blood transition-all duration-300"
          style={{ width: `${p}%` }}
        />
      </div>
      <div className="w-10 text-right text-sm text-ink font-serif">{value}</div>
    </div>
  );
}
