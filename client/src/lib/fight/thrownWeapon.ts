// Animación de arma volando desde el thrower hacia el target (proyectil
// recto con rotación apuntando to destino). Para drops con física (gravedad
// + rebotes), ver `droppedWeapon.ts`.

import * as PIXI from 'pixi.js';
import { Tweener, Easing } from 'pixi-tweener';
import { getWeaponTexture } from '@/lib/fight/weaponAtlas';

export interface ThrowOptions {
  stage: PIXI.Container;
  weaponId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Multiplicador de velocidad. */
  speed?: number;
}

/**
 * Spear un sprite del arma desde `from` hasta `to` con rotación apuntando al
 * destino. Resuelve cuando el sprite llega y se destruye.
 *
 * Si el atlas no is cargado o la weapon no tiene frame, resuelve casi al
 * instante (~80ms) sin animación visible.
 */
export async function throwWeaponSprite(opts: ThrowOptions): Promise<void> {
  const tex = await getWeaponTexture(opts.weaponId);
  if (!tex) {
    await new Promise<void>((res) => setTimeout(res, 80));
    return;
  }
  const sprite = new PIXI.Sprite(tex);
  sprite.anchor.set(0.5, 0.5);
  sprite.scale.set(1.4); // subir un poco para visibilidad
  sprite.position.set(opts.from.x, opts.from.y);
  // Apuntar to destino.
  sprite.angle = (Math.atan2(opts.to.y - opts.from.y, opts.to.x - opts.from.x) * 180) / Math.PI;
  sprite.zIndex = 70;
  opts.stage.addChild(sprite);

  const speed = opts.speed ?? 1;
  await Tweener.add(
    {
      target: sprite,
      duration: 0.28 / speed,
      ease: Easing.linear,
    },
    { x: opts.to.x, y: opts.to.y },
  );

  if (!sprite.destroyed) {
    sprite.parent?.removeChild(sprite);
    sprite.destroy();
  }
}
