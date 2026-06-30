import clsx from 'clsx';
import { STAT_ICONS, type StatKey } from '@/lib/assets';

interface StatBarProps {
  label: string;
  statKey: StatKey;
  value: number;
  /** Total de cuadritos para representar el rango (default 10). */
  cells?: number;
  /** Valor que llena la barra to 100%. Default 10. */
  max?: number;
  className?: string;
}

/**
 * Barra de stats estilo MyBrute: peldaños cuadrados amarillos sobre marcón.
 * Diferente de la HPBar (que es continua) — esta es para Strength/Agility/Speed.
 */
export function StatBar({
  label,
  statKey,
  value,
  cells = 10,
  max = 10,
  className,
}: StatBarProps) {
  const filled = Math.max(0, Math.min(cells, Math.round((value / max) * cells)));
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <img
        src={STAT_ICONS[statKey]}
        alt=""
        className="w-5 h-5 object-contain shrink-0"
      />
      <div className="text-sm font-display text-ink-strong w-24 shrink-0">
        {label}: <span className="font-sans">{value}</span>
      </div>
      <div className="flex gap-px flex-1">
        {Array.from({ length: cells }).map((_, i) => (
          <div
            key={i}
            className="h-3 flex-1 border"
            style={{
              borderColor: 'var(--border-outer)',
              background:
                i < filled
                  ? statKey === 'hp'
                    ? 'var(--hp-full)'
                    : 'var(--accent-gold)'
                  : 'rgba(0, 0, 0, 0.4)',
              boxShadow:
                i < filled
                  ? 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.4)'
                  : 'inset 0 0 0 1px rgba(0,0,0,0.5)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
