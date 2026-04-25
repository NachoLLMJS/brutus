import { getPet } from 'core';
import { Tooltip } from './SkillBadge';
import { petAsset, FALLBACK_PET } from '@/lib/assets';

interface PetBadgeProps {
  petId: string;
}

export function PetBadge({ petId }: PetBadgeProps) {
  const p = getPet(petId);
  const name = p?.name ?? petId;
  const description = p?.description ?? 'Mascota desconocida.';
  return (
    <span
      className="badge group relative cursor-help inline-flex items-center gap-1.5"
      tabIndex={0}
      aria-label={`Mascota: ${name}`}
    >
      <img
        src={petAsset(petId)}
        alt=""
        className="w-5 h-5 inline-block object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = FALLBACK_PET;
        }}
      />
      {name}
      <Tooltip text={description} />
    </span>
  );
}
