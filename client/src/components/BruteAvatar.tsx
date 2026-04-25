import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { Appearance } from 'core';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarAnim {
  facing?: 'left' | 'right';
  swing?: number; // 0..1: animación de golpe (extiende brazo)
  hitFlash?: number; // 0..1: tinte rojo cuando recibe
  hpPct?: number; // 0..1: opcional, oscurece si bajo
}

interface BruteAvatarProps {
  appearance: Appearance;
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
 * Avatar dibujado por capas en canvas.
 * Composición ultra-simplificada: cabeza, pelo, torso (camisa), pantalón,
 * brazos y piernas. Diferencias por género: F tiene hombros más estrechos.
 *
 * No depende de assets externos: todo es shape-drawing programático para
 * mantener la build sin imágenes y la temática de fantasía dark.
 */
export function BruteAvatar({
  appearance,
  size = 'md',
  anim,
  className,
}: BruteAvatarProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const px = SIZE_PX[size];

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawBrute(ctx, px, appearance, anim);
  }, [appearance, anim, px]);

  return (
    <canvas
      ref={ref}
      width={px}
      height={px}
      style={{ width: px, height: px }}
      className={clsx('rounded-md select-none', className)}
      aria-label={`Avatar (${appearance.gender === 'F' ? 'mujer' : 'hombre'})`}
    />
  );
}

// ---------- drawing ----------

function drawBrute(
  ctx: CanvasRenderingContext2D,
  size: number,
  app: Appearance,
  anim: AvatarAnim | undefined,
): void {
  const gender = app.gender ?? 'M';
  const facingLeft = anim?.facing === 'left';
  const swing = anim?.swing ?? 0;
  const hitFlash = anim?.hitFlash ?? 0;
  const hpPct = anim?.hpPct ?? 1;

  ctx.clearRect(0, 0, size, size);

  // Background "pedestal" — ligero halo arcano
  ctx.save();
  ctx.translate(size / 2, size / 2);
  if (facingLeft) ctx.scale(-1, 1);
  ctx.translate(-size / 2, -size / 2);

  // Halo bajo los pies
  const grad = ctx.createRadialGradient(size / 2, size * 0.92, 2, size / 2, size * 0.92, size * 0.45);
  grad.addColorStop(0, 'rgba(110, 58, 170, 0.28)');
  grad.addColorStop(1, 'rgba(110, 58, 170, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Proporciones (todo en fracciones de `size`)
  const cx = size / 2;
  const headR = size * 0.11;
  const headY = size * 0.22;
  const torsoTop = headY + headR * 0.9;
  const torsoBottom = size * 0.62;
  const torsoHalfWidth = (gender === 'F' ? 0.11 : 0.14) * size;
  const hipHalfWidth = (gender === 'F' ? 0.13 : 0.12) * size;
  const legBottom = size * 0.92;
  const armOffset = swing * size * 0.18;

  // Pantalón (piernas)
  ctx.fillStyle = app.pants;
  ctx.beginPath();
  ctx.moveTo(cx - hipHalfWidth, torsoBottom);
  ctx.lineTo(cx - hipHalfWidth * 0.5, legBottom);
  ctx.lineTo(cx - hipHalfWidth * 0.05, legBottom);
  ctx.lineTo(cx - hipHalfWidth * 0.1, torsoBottom);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + hipHalfWidth * 0.1, torsoBottom);
  ctx.lineTo(cx + hipHalfWidth * 0.05, legBottom);
  ctx.lineTo(cx + hipHalfWidth * 0.5, legBottom);
  ctx.lineTo(cx + hipHalfWidth, torsoBottom);
  ctx.closePath();
  ctx.fill();

  // Camisa (torso)
  ctx.fillStyle = app.shirt;
  ctx.beginPath();
  ctx.moveTo(cx - torsoHalfWidth, torsoTop);
  ctx.lineTo(cx + torsoHalfWidth, torsoTop);
  ctx.lineTo(cx + hipHalfWidth, torsoBottom);
  ctx.lineTo(cx - hipHalfWidth, torsoBottom);
  ctx.closePath();
  ctx.fill();

  // Brazos (camisa + piel)
  const shoulderY = torsoTop + size * 0.02;
  const handBaseY = size * 0.6;
  ctx.fillStyle = app.shirt;
  // brazo izquierdo
  ctx.fillRect(cx - torsoHalfWidth - size * 0.04, shoulderY, size * 0.04, size * 0.18);
  // brazo derecho (puede extenderse con swing)
  ctx.fillRect(
    cx + torsoHalfWidth,
    shoulderY,
    size * 0.04 + armOffset * 0.3,
    size * 0.18,
  );

  // Manos (piel)
  ctx.fillStyle = app.skin;
  ctx.beginPath();
  ctx.arc(cx - torsoHalfWidth - size * 0.02, handBaseY, size * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    cx + torsoHalfWidth + size * 0.02 + armOffset,
    handBaseY,
    size * 0.025,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Cabeza
  ctx.fillStyle = app.skin;
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Pelo (casco superior)
  ctx.fillStyle = app.hair;
  ctx.beginPath();
  ctx.arc(cx, headY - size * 0.005, headR * 1.05, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + headR * 0.95, headY + headR * 0.3);
  ctx.lineTo(cx - headR * 0.95, headY + headR * 0.3);
  ctx.closePath();
  ctx.fill();
  if (gender === 'F') {
    // mechón largo
    ctx.beginPath();
    ctx.ellipse(cx, headY + headR * 0.6, headR * 1.1, headR * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ojos (un par de runas oscuras)
  ctx.fillStyle = '#1a0f22';
  ctx.beginPath();
  ctx.arc(cx - headR * 0.4, headY + headR * 0.05, headR * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + headR * 0.4, headY + headR * 0.05, headR * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // hit flash
  if (hitFlash > 0) {
    ctx.globalAlpha = Math.min(1, hitFlash) * 0.55;
    ctx.fillStyle = '#c44a2c';
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
  }

  // hp dim
  if (hpPct < 0.25) {
    ctx.globalAlpha = (0.25 - hpPct) * 1.5;
    ctx.fillStyle = '#0b0610';
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
