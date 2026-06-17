// Turn meter pips: cada pip representa un step. Done (cumplido), now (current,
// pulsing dorado), pending (vacío).

import clsx from 'clsx';

interface TurnPipsProps {
  total: number;
  current: number;
}

export function TurnPips({ total, current }: TurnPipsProps) {
  // Limitar pips a 60 max para no romper layout en peleas largas.
  const visibleTotal = Math.min(total, 60);
  const ratio = total > 0 ? visibleTotal / total : 1;
  const visibleCurrent = Math.floor(current * ratio);
  return (
    <div className="turn-pips">
      {Array.from({ length: visibleTotal }).map((_, i) => (
        <span
          key={i}
          className={clsx('tp', i < visibleCurrent && 'done', i === visibleCurrent && 'now')}
        />
      ))}
    </div>
  );
}
