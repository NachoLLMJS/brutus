import { getSkill, getWeapon, getPet } from 'core';
import { skillAsset, weaponAsset, petAsset, FALLBACK_SKILL, FALLBACK_WEAPON, FALLBACK_PET } from '@/lib/assets';
import clsx from 'clsx';

interface IconProps {
  /** Si true, se muestra apagado (skill/arma "posible pero no obtenida"). */
  muted?: boolean;
  className?: string;
}

interface SkillIconProps extends IconProps {
  skillId: string;
}
interface WeaponIconProps extends IconProps {
  weaponId: string;
}
interface PetIconProps extends IconProps {
  petId: string;
}

/**
 * Iconos cuadrados estilo MyBrute (sticker): 32x32, fondo crema, borde marrón.
 * Tooltip con nombre + descripción to hover.
 */
export function SkillIcon({ skillId, muted, className }: SkillIconProps) {
  const s = getSkill(skillId);
  return (
    <Sticker
      label={s?.name ?? skillId}
      description={s?.description}
      src={skillAsset(skillId)}
      fallback={FALLBACK_SKILL}
      muted={muted}
      className={className}
    />
  );
}

export function WeaponIcon({ weaponId, muted, className }: WeaponIconProps) {
  const w = getWeapon(weaponId);
  return (
    <Sticker
      label={w?.name ?? weaponId}
      description={w?.description}
      src={weaponAsset(weaponId)}
      fallback={FALLBACK_WEAPON}
      muted={muted}
      className={className}
    />
  );
}

export function PetIcon({ petId, muted, className }: PetIconProps) {
  const p = getPet(petId);
  return (
    <Sticker
      label={p?.name ?? petId}
      description={p?.description}
      src={petAsset(petId)}
      fallback={FALLBACK_PET}
      muted={muted}
      className={className}
    />
  );
}

interface StickerProps {
  label: string;
  description?: string;
  src: string;
  fallback: string;
  muted?: boolean;
  className?: string;
}

function Sticker({ label, description, src, fallback, muted, className }: StickerProps) {
  return (
    <span
      className={clsx('sticker', muted && 'muted', className)}
      tabIndex={0}
      aria-label={label}
    >
      <img
        src={src}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = fallback;
        }}
      />
      <span role="tooltip" className="tt">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </span>
    </span>
  );
}
