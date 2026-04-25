import { getSkill } from 'core';
import { skillAsset, FALLBACK_SKILL } from '@/lib/assets';

interface SkillBadgeProps {
  skillId: string;
}

export function SkillBadge({ skillId }: SkillBadgeProps) {
  const s = getSkill(skillId);
  const name = s?.name ?? skillId;
  const description = s?.description ?? 'Habilidad desconocida.';
  return (
    <span
      className="badge group relative cursor-help inline-flex items-center gap-1.5"
      tabIndex={0}
      aria-label={`Habilidad: ${name}`}
    >
      <img
        src={skillAsset(skillId)}
        alt=""
        className="w-5 h-5 inline-block object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = FALLBACK_SKILL;
        }}
      />
      {name}
      <Tooltip text={description} />
    </span>
  );
}

export function Tooltip({ text }: { text: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20
        opacity-0 group-hover:opacity-100 group-focus:opacity-100
        transition-opacity duration-150
        whitespace-normal max-w-[14rem] text-xs
        bg-elevated border border-arcane rounded-md px-2 py-1 text-ink shadow-rune"
    >
      {text}
    </span>
  );
}
