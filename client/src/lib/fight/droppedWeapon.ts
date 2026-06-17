// Drop de arma con física: gravedad, rebotes en el suelo, rotación, sombra
// dinámica y fade-out tras N rebotes. Inspirado en `itemDrop.ts` de LaBrute.
//
// Usado por `animDisarm` (defensor le quita el arma al atacante: vuela y
// cae) y `animTrash` (bruto descarta el arma para hacer swap).

import * as PIXI from 'pixi.js';
import { getWeaponTexture } from '@/lib/fight/weaponAtlas';

export interface DropOptions {
  stage: PIXI.Container;
  weaponId: string;
  from: { x: number; y: number };
  /** Y absoluto del suelo en el stage (donde rebotan). */
  groundY: number;
  /** Dirección horizontal: 1 hacia derecha, -1 hacia izquierda. */
  direction: 1 | -1;
  /** Multiplicador global de velocidad de animación. */
  speed?: number;
  /** Velocidad horizontal inicial (px/seg). Default 280. */
  initialVx?: number;
  /** Velocidad vertical inicial (px/seg, negativo = hacia arriba). Default -340. */
  initialVy?: number;
  /** Coeficiente de rebote vertical (0..1). Default 0.55. */
  bounciness?: number;
  /** Velocidad angular inicial (rad/seg). Default Math.PI*4. */
  angularVelocity?: number;
  /** Cantidad de rebotes antes de empezar el fade-out. Default 3. */
  bouncesBeforeFade?: number;
}

/**
 * Spawn de un sprite de arma en `from` que cae con gravedad, rebota en
 * `groundY` y se desvanece. No bloqueante.
 */
export async function dropWeaponWithPhysics(opts: DropOptions): Promise<void> {
  const tex = await getWeaponTexture(opts.weaponId);
  if (!tex) return;

  const sprite = new PIXI.Sprite(tex);
  sprite.anchor.set(0.5, 0.5);
  sprite.scale.set(1.4);
  sprite.position.set(opts.from.x, opts.from.y);
  sprite.zIndex = 65;
  opts.stage.addChild(sprite);

  // Sombra: elipse oscura en el suelo cuya escala depende de la altura.
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.4);
  shadow.drawEllipse(0, 0, 14, 4);
  shadow.endFill();
  shadow.zIndex = 6;
  shadow.x = opts.from.x;
  shadow.y = opts.groundY + 2;
  opts.stage.addChild(shadow);

  const speed = opts.speed ?? 1;
  const gravity = 1100; // px/seg^2
  let vx = (opts.initialVx ?? 280) * opts.direction;
  let vy = opts.initialVy ?? -340;
  const bounciness = opts.bounciness ?? 0.55;
  let angularVel = (opts.angularVelocity ?? Math.PI * 4) * opts.direction;
  const bouncesMax = opts.bouncesBeforeFade ?? 3;
  let bounces = 0;

  const startTime = performance.now();
  let lastTime = startTime;
  // Safety timeout: si por alguna razón el loop no termina, máximo 3s.
  const HARD_LIMIT_MS = 3500;

  return new Promise<void>((resolve) => {
    const tick = () => {
      if (sprite.destroyed) {
        resolve();
        return;
      }
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000) * speed;
      lastTime = now;

      // Integrar.
      vy += gravity * dt;
      sprite.x += vx * dt;
      sprite.y += vy * dt;
      sprite.rotation += angularVel * dt;

      // Sombra sigue al sprite en X y escala con la altura.
      shadow.x = sprite.x;
      const heightAboveGround = Math.max(0, opts.groundY - sprite.y);
      const shadowScale = Math.max(0.3, 1 - heightAboveGround / 200);
      shadow.scale.set(shadowScale, shadowScale);
      shadow.alpha = 0.4 * shadowScale;

      // Colisión con el suelo.
      if (sprite.y >= opts.groundY && vy > 0) {
        sprite.y = opts.groundY;
        vy = -vy * bounciness;
        vx *= 0.7; // fricción
        angularVel *= 0.6;
        bounces++;
        if (Math.abs(vy) < 30) {
          // Asentado: empezar fade.
          bounces = bouncesMax;
        }
      }

      // Fade-out tras N rebotes.
      if (bounces >= bouncesMax) {
        sprite.alpha -= dt * 1.6;
        shadow.alpha -= dt * 1.6;
        if (sprite.alpha <= 0) {
          if (!sprite.destroyed) {
            sprite.parent?.removeChild(sprite);
            sprite.destroy();
          }
          if (!shadow.destroyed) {
            shadow.parent?.removeChild(shadow);
            shadow.destroy();
          }
          resolve();
          return;
        }
      }

      // Hard timeout.
      if (now - startTime > HARD_LIMIT_MS) {
        if (!sprite.destroyed) {
          sprite.parent?.removeChild(sprite);
          sprite.destroy();
        }
        if (!shadow.destroyed) {
          shadow.parent?.removeChild(shadow);
          shadow.destroy();
        }
        resolve();
        return;
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
