import { getWeapon } from 'core';
import { Tooltip } from './SkillBadge';
import { weaponAsset, FALLBACK_WEAPON } from '@/lib/assets';

interface WeaponBadgeProps {
  weaponId: string;
}

export function WeaponBadge({ weaponId }: WeaponBadgeProps) {
  const w = getWeapon(weaponId);
  const name = w?.name ?? weaponId;
  const description = w?.description ?? 'Arma desconocida.';
  return (
    <span
      className="badge group relative cursor-help inline-flex items-center gap-1.5"
      tabIndex={0}
      aria-label={`Arma: ${name}`}
    >
      <img
        src={weaponAsset(weaponId)}
        alt=""
        className="w-5 h-5 inline-block object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = FALLBACK_WEAPON;
        }}
      />
      {name}
      <Tooltip text={description} />
    </span>
  );
}
