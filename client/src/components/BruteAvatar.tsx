import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useRenderer } from '@/hooks/useRenderer';
import {
  LpcAvatarPreview,
  LPC_ARMS_ARMOR_OPTIONS,
  LPC_ARMOR_COLOR_OPTIONS,
  LPC_FEET_ARMOR_OPTIONS,
  LPC_HAIR_OPTIONS,
  LPC_HEAD_OPTIONS,
  LPC_HEADWEAR_OPTIONS,
  LPC_LEGS_ARMOR_OPTIONS,
  LPC_TORSO_ARMOR_OPTIONS,
  LPC_WEAPON_OPTIONS,
  LPC_WINGS_OPTIONS,
  type LpcArmsArmorKey,
  type LpcArmorColorKey,
  type LpcFeetArmorKey,
  type LpcHairKey,
  type LpcHeadKey,
  type LpcHeadwearKey,
  type LpcLegsArmorKey,
  type LpcTorsoArmorKey,
  type LpcWeaponKey,
  type LpcWingsKey,
} from '@/components/LpcAvatarPreview';
import type { BruteGender, LpcAppearance } from 'core';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarAnim {
  facing?: 'left' | 'right';
  // Animaciones disponibles después en Fase 2 (combat). Por ahora se ignoran.
  swing?: number;
  hitFlash?: number;
  hpPct?: number;
}

/**
 * Datos mínimos para renderizar el avatar Pixi clásico o el avatar LPC nuevo.
 */
export interface BruteAvatarSubject {
  id: string;
  gender: BruteGender;
  body: string;
  bodyColors: string;
  appearance?: { lpc?: Partial<LpcAppearance> };
  lpc?: Partial<LpcAppearance>;
}

interface BruteAvatarProps {
  brute: BruteAvatarSubject;
  size?: AvatarSize;
  anim?: AvatarAnim;
  className?: string;
}

const SIZE_PX: Record<AvatarSize, number> = {
  sm: 64,
  md: 120,
  lg: 200,
};

const LPC_SCALE: Record<AvatarSize, number> = {
  sm: 2,
  md: 3,
  lg: 4,
};

function keyOrDefault<T extends string>(
  value: string | undefined,
  options: ReadonlyArray<{ key: T }>,
  fallback: T,
): T {
  return options.some((option) => option.key === value) ? (value as T) : fallback;
}

function normalizeLpc(raw: Partial<LpcAppearance> | undefined) {
  if (!raw) return null;
  const headwear = keyOrDefault(raw.headwear, LPC_HEADWEAR_OPTIONS, 'none' as LpcHeadwearKey);
  const hair = headwear === 'none'
    ? keyOrDefault(raw.hair, LPC_HAIR_OPTIONS, 'bedhead' as LpcHairKey)
    : 'none';
  return {
    head: keyOrDefault(raw.head, LPC_HEAD_OPTIONS, 'humanMale' as LpcHeadKey),
    hair,
    wings: keyOrDefault(raw.wings, LPC_WINGS_OPTIONS, 'none' as LpcWingsKey),
    headwear,
    armsArmor: keyOrDefault(raw.armsArmor, LPC_ARMS_ARMOR_OPTIONS, 'none' as LpcArmsArmorKey),
    torsoArmor: keyOrDefault(raw.torsoArmor, LPC_TORSO_ARMOR_OPTIONS, 'plate' as LpcTorsoArmorKey),
    legsArmor: keyOrDefault(raw.legsArmor, LPC_LEGS_ARMOR_OPTIONS, 'plate' as LpcLegsArmorKey),
    feetArmor: keyOrDefault(raw.feetArmor, LPC_FEET_ARMOR_OPTIONS, 'plate' as LpcFeetArmorKey),
    armorColor: keyOrDefault(raw.armorColor, LPC_ARMOR_COLOR_OPTIONS, 'steel' as LpcArmorColorKey),
    weapon: keyOrDefault(raw.weapon, LPC_WEAPON_OPTIONS, 'none' as LpcWeaponKey),
  };
}

/**
 * Avatar real. Si el bruto tiene `appearance.lpc`, usa el modelo LPC nuevo.
 * Si no, cae al renderer clásico Pixi/LaBrute para datos legacy.
 */
export function BruteAvatar({ brute, size = 'md', anim, className }: BruteAvatarProps) {
  const lpc = normalizeLpc(brute?.appearance?.lpc ?? brute?.lpc);
  const renderer = useRenderer();
  const [src, setSrc] = useState<string | null>(null);
  const px = SIZE_PX[size];

  useEffect(() => {
    if (lpc) {
      setSrc(null);
      return;
    }
    if (!brute?.body || !brute?.bodyColors) return;
    let cancelled = false;
    renderer.onRender(brute.id, (content) => {
      if (!cancelled) setSrc(content);
    });
    renderer.render({
      id: brute.id,
      gender: brute.gender,
      body: brute.body,
      bodyColors: brute.bodyColors,
    });
    return () => {
      cancelled = true;
    };
  }, [brute?.id, brute?.gender, brute?.body, brute?.bodyColors, renderer, lpc]);

  const flip = anim?.facing === 'right';

  return (
    <div
      className={clsx(
        'relative flex items-center justify-center select-none overflow-hidden',
        className,
      )}
      style={{ width: px, height: px }}
      aria-label="Avatar del bruto"
    >
      {lpc ? (
        <div
          style={{
            transform: flip ? 'scaleX(-1)' : undefined,
            transformOrigin: 'center',
          }}
        >
          <LpcAvatarPreview
            head={lpc.head}
            hair={lpc.hair}
            wings={lpc.wings}
            headwear={lpc.headwear}
            armsArmor={lpc.armsArmor}
            torsoArmor={lpc.torsoArmor}
            legsArmor={lpc.legsArmor}
            feetArmor={lpc.feetArmor}
            armorColor={lpc.armorColor}
            weapon={lpc.weapon}
            scale={LPC_SCALE[size]}
            compact
          />
        </div>
      ) : src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            imageRendering: 'auto',
            transform: flip ? 'scaleX(-1)' : undefined,
          }}
        />
      ) : (
        <div
          className="w-full h-full rounded-md border border-arcane bg-elevated/50"
          aria-hidden
        />
      )}
    </div>
  );
}
