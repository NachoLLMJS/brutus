import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useRenderer } from '@/hooks/useRenderer';
import type { BruteGender } from 'core';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarAnim {
  facing?: 'left' | 'right';
  // Animaciones disponibles después en Fase 2 (combat). Por ahora se ignoran.
  swing?: number;
  hitFlash?: number;
  hpPct?: number;
}

/**
 * Datos mínimos para renderizar el avatar Pixi.
 * Coincide con los campos que el server expone (`brute.id`, `brute.gender`,
 * `brute.body`, `brute.bodyColors`).
 */
export interface BruteAvatarSubject {
  id: string;
  gender: BruteGender;
  body: string;
  bodyColors: string;
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

/**
 * Avatar real renderizado con Pixi.js a partir de las piezas de
 * `labrute-static-fla-parser`. Devuelve un WebP base64 que se monta en un
 * <img>. Se cachea por id en `useRenderer`.
 *
 * Si el bruto no tiene body/bodyColors (datos legacy), muestra un placeholder
 * sutil mientras se hidrata.
 */
export function BruteAvatar({ brute, size = 'md', anim, className }: BruteAvatarProps) {
  const renderer = useRenderer();
  const [src, setSrc] = useState<string | null>(null);
  const px = SIZE_PX[size];

  useEffect(() => {
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
  }, [brute?.id, brute?.gender, brute?.body, brute?.bodyColors, renderer]);

  const flip = anim?.facing === 'right';

  return (
    <div
      className={clsx(
        'relative flex items-center justify-center select-none',
        className,
      )}
      style={{ width: px, height: px }}
      aria-label="Avatar del bruto"
    >
      {src ? (
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
