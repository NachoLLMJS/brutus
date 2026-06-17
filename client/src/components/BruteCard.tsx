import clsx from 'clsx';
import type { Brute } from 'core';
import { BruteAvatar } from './BruteAvatar';
import { formatRank } from '@/lib/format';

interface BruteCardProps {
  brute: Brute;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function BruteCard({ brute, onClick, selected, className }: BruteCardProps) {
  const interactive = typeof onClick === 'function';
  const Tag = interactive ? 'button' : 'div';
  const rankLabel = formatRank(brute.rank);
  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'panel p-3 flex flex-col items-center gap-2 text-center transition-all duration-200',
        interactive && 'hover:shadow-rune-strong hover:-translate-y-0.5 focus:shadow-rune-strong focus:outline-none',
        selected && 'shadow-rune-strong border-rune',
        className,
      )}
    >
      <BruteAvatar brute={brute} size="md" />
      <div className="flex flex-col gap-0.5">
        <div className="font-serif text-lg text-ink leading-tight">{brute.name}</div>
        <div className="text-xs text-muted">
          Nivel {brute.level}
          {rankLabel && (
            <>
              <span aria-hidden> · </span>
              <span className="text-gold">{rankLabel}</span>
            </>
          )}
        </div>
        <div className="text-[11px] text-muted">
          <span className="text-hp-full">{brute.victories}V</span>
          <span aria-hidden> / </span>
          <span className="text-hp-low">{brute.defeats}D</span>
        </div>
      </div>
    </Tag>
  );
}
