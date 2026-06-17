// Efectos visuales reutilizables para el FightStage.
// Pixi 6.5.9 compatible. Todas las funciones son no bloqueantes salvo
// que se aclare lo contrario. Las animaciones usan `pixi-tweener`.
//
// Convenciones:
// - `target` es un Container: el efecto se aplica con filters / hijos visuales.
// - `stage` es el contenedor raíz: ahí se montan partículas / textos flotantes.
// - Ningún efecto bloquea más de ~600ms en el mainline.

import * as PIXI from 'pixi.js';
import { Tweener, Easing } from 'pixi-tweener';
import { GlowFilter } from '@pixi/filter-glow';
import { ColorOverlayFilter } from '@pixi/filter-color-overlay';
import { MotionBlurFilter } from '@pixi/filter-motion-blur';

// ───────────────────────── helpers ─────────────────────────
//
// Los filtros externos (@pixi/filter-glow, @pixi/filter-color-overlay, etc.)
// extienden `Filter` desde su propia versión de @pixi/core (a veces una v7
// instalada en el root del workspace), mientras que pixi.js usa @pixi/core v6.
// Las clases son estructuralmente iguales, pero TS detecta `_resolution` como
// `protected` y rechaza la asignación. Casteamos a `PIXI.Filter` al asignar
// para puentear el mismatch — funciona en runtime porque la instancia es la
// misma.
function appendFilter(target: PIXI.Container, f: unknown): void {
  const current = target.filters ? [...target.filters] : [];
  current.push(f as PIXI.Filter);
  target.filters = current;
}

function removeFilter(target: PIXI.Container, f: unknown): void {
  if (!target.filters) return;
  const next = target.filters.filter((x) => x !== (f as PIXI.Filter));
  target.filters = next.length ? next : null;
}

// ───────────────────────── flashColor ─────────────────────────

/**
 * Aplica un overlay de color que se desvanece en `durationMs`.
 * Resuelve cuando el efecto terminó.
 */
export function flashColor(
  target: PIXI.Container,
  color: number,
  durationMs: number,
): Promise<void> {
  const filter = new ColorOverlayFilter(color, 0.6);
  appendFilter(target, filter);

  return new Promise((resolve) => {
    Tweener.add(
      {
        target: filter,
        duration: durationMs / 1000,
        ease: Easing.easeOutQuad,
      },
      { alpha: 0 },
    ).then(() => {
      removeFilter(target, filter);
      resolve();
    });
  });
}

// ───────────────────────── glow ─────────────────────────

/**
 * Aplica un GlowFilter al target con fade-in y fade-out simétrico.
 * Resuelve cuando el efecto terminó.
 */
export function glow(
  target: PIXI.Container,
  color: number,
  durationMs: number,
): Promise<void> {
  const filter = new GlowFilter({
    distance: 12,
    outerStrength: 0,
    innerStrength: 0,
    color,
    quality: 0.2,
  });
  appendFilter(target, filter);

  const halfSec = (durationMs / 2) / 1000;
  return new Promise((resolve) => {
    Tweener.add(
      { target: filter, duration: halfSec, ease: Easing.easeOutQuad },
      { outerStrength: 4 },
    ).then(() => {
      Tweener.add(
        { target: filter, duration: halfSec, ease: Easing.easeInQuad },
        { outerStrength: 0 },
      ).then(() => {
        removeFilter(target, filter);
        resolve();
      });
    });
  });
}

// ───────────────────────── screenShake ─────────────────────────

/**
 * Sacude el stage con `intensity` px durante `durationMs`. Restaura la
 * posición original al terminar. Resuelve cuando el shake terminó.
 */
export function screenShake(
  stage: PIXI.Container,
  intensity: number,
  durationMs: number,
): Promise<void> {
  const startX = stage.x;
  const startY = stage.y;
  const start = performance.now();

  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= durationMs) {
        stage.x = startX;
        stage.y = startY;
        resolve();
        return;
      }
      const decay = 1 - elapsed / durationMs;
      stage.x = startX + (Math.random() - 0.5) * 2 * intensity * decay;
      stage.y = startY + (Math.random() - 0.5) * 2 * intensity * decay;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// ───────────────────────── floatingText ─────────────────────────

/**
 * Texto que aparece en (x,y), sube y se desvanece. Resuelve cuando el texto
 * fue removido del stage.
 */
export function floatingText(
  stage: PIXI.Container,
  x: number,
  y: number,
  text: string,
  color: number,
): Promise<void> {
  const t = new PIXI.Text(text, {
    fontFamily: 'Arial, sans-serif',
    fontSize: 18,
    fontWeight: 'bold',
    fill: color,
    stroke: 0x000000,
    strokeThickness: 3,
    align: 'center',
  });
  t.anchor.set(0.5, 1);
  t.x = x;
  t.y = y;
  t.zIndex = 1000;
  stage.addChild(t);

  return new Promise((resolve) => {
    Tweener.add(
      {
        target: t,
        duration: 0.55,
        ease: Easing.easeOutQuad,
      },
      { y: y - 36, alpha: 0 },
    ).then(() => {
      if (!t.destroyed) {
        stage.removeChild(t);
        t.destroy();
      }
      resolve();
    });
  });
}

// ───────────────────────── particles ─────────────────────────

export interface ParticleOptions {
  count: number;
  color: number;
  /** Vida total en ms. */
  life: number;
  /** Radio máximo de dispersión, en px. */
  spread: number;
}

/**
 * Emite partículas simples (círculos) desde (x,y). Cada una se anima con
 * tweener (alpha + posición) y se destruye al terminar. No bloqueante.
 */
export function particles(
  stage: PIXI.Container,
  x: number,
  y: number,
  opts: ParticleOptions,
): void {
  const { count, color, life, spread } = opts;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = spread * (0.4 + Math.random() * 0.6);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - spread * 0.2; // sesgo hacia arriba

    const g = new PIXI.Graphics();
    const r = 2 + Math.random() * 3;
    g.beginFill(color, 1);
    g.drawCircle(0, 0, r);
    g.endFill();
    g.x = x;
    g.y = y;
    g.zIndex = 999;
    stage.addChild(g);

    void Tweener.add(
      {
        target: g,
        duration: life / 1000,
        ease: Easing.easeOutQuad,
      },
      {
        x: x + dx,
        y: y + dy,
        alpha: 0,
      },
    ).then(() => {
      if (!g.destroyed) {
        stage.removeChild(g);
        g.destroy();
      }
    });
  }
}

// ───────────────────────── motion blur ─────────────────────────

/**
 * Aplica un MotionBlurFilter horizontal por `durationMs`. No bloqueante por
 * defecto: devuelve la promesa por si el caller quiere awaitear.
 */
export function motionBlur(
  target: PIXI.Container,
  velocity: number,
  durationMs: number,
): Promise<void> {
  const filter = new MotionBlurFilter([velocity, 0], 7, 0);
  appendFilter(target, filter);

  return new Promise((resolve) => {
    setTimeout(() => {
      removeFilter(target, filter);
      resolve();
    }, durationMs);
  });
}

// ───────────────────────── conveniencias ─────────────────────────

export function redFlash(target: PIXI.Container, ms = 200): Promise<void> {
  return flashColor(target, 0xff2030, ms);
}

export function goldFlash(target: PIXI.Container, ms = 250): Promise<void> {
  return flashColor(target, 0xffd84a, ms);
}

// ───────────────────────── bloodSplatter ─────────────────────────

/**
 * 8-12 gotas rojas saliendo en abanico desde (x,y), con física parabólica
 * (caen) + fade en ~600ms. Para crits.
 */
export function bloodSplatter(
  stage: PIXI.Container,
  x: number,
  y: number,
  intensity = 1,
): void {
  const count = Math.floor(8 + intensity * 4);
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2; // hacia arriba con dispersión
    const speed = (40 + Math.random() * 60) * intensity;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const g = new PIXI.Graphics();
    const r = 1.5 + Math.random() * 2.5;
    g.beginFill(0xb91c1c, 1);
    g.drawCircle(0, 0, r);
    g.endFill();
    g.x = x;
    g.y = y;
    g.zIndex = 998;
    stage.addChild(g);

    // Parábola: x lineal, y con gravedad. Aprox con tween a posición final.
    const life = 0.55 + Math.random() * 0.2;
    const endX = x + vx * life;
    const endY = y + vy * life * 0.5 + 50 * life * life * 30; // pseudo gravity

    void Tweener.add(
      { target: g, duration: life, ease: Easing.easeInQuad },
      { x: endX, y: endY, alpha: 0 },
    ).then(() => {
      if (!g.destroyed) {
        stage.removeChild(g);
        g.destroy();
      }
    });
  }
}

// ───────────────────────── dustCloud ─────────────────────────

/**
 * 4-6 partículas color crema/marrón saliendo bajas y dispersándose
 * horizontalmente. Para usar al correr o caer.
 */
export function dustCloud(
  stage: PIXI.Container,
  x: number,
  y: number,
  opts: { count?: number; color?: number; spread?: number } = {},
): void {
  const count = opts.count ?? 5;
  const color = opts.color ?? 0xc9a070;
  const spread = opts.spread ?? 30;
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; // arriba+lateral
    const dist = spread * (0.5 + Math.random() * 0.7);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.4; // bajo y plano

    const g = new PIXI.Graphics();
    const r = 3 + Math.random() * 3;
    g.beginFill(color, 0.7);
    g.drawCircle(0, 0, r);
    g.endFill();
    g.x = x + (Math.random() - 0.5) * 16;
    g.y = y;
    g.zIndex = 30;
    stage.addChild(g);

    void Tweener.add(
      { target: g, duration: 0.4, ease: Easing.easeOutQuad },
      { x: g.x + dx, y: g.y + dy, alpha: 0 },
    ).then(() => {
      if (!g.destroyed) {
        stage.removeChild(g);
        g.destroy();
      }
    });
  }
}

// ───────────────────────── souls ─────────────────────────

/**
 * 5-7 motas blancas/doradas que suben desde (x,y) y se desvanecen.
 * Para muerte.
 */
export function souls(stage: PIXI.Container, x: number, y: number): void {
  const count = 6;
  for (let i = 0; i < count; i++) {
    const dx = (Math.random() - 0.5) * 30;
    const dy = -60 - Math.random() * 50;

    const g = new PIXI.Graphics();
    g.beginFill(0xfff5e0, 0.9);
    g.drawCircle(0, 0, 2 + Math.random() * 2);
    g.endFill();
    g.x = x + (Math.random() - 0.5) * 20;
    g.y = y;
    g.zIndex = 990;
    stage.addChild(g);

    void Tweener.add(
      {
        target: g,
        duration: 1.0 + Math.random() * 0.4,
        ease: Easing.easeOutQuad,
        delay: i * 0.05,
      },
      { x: g.x + dx, y: g.y + dy, alpha: 0 },
    ).then(() => {
      if (!g.destroyed) {
        stage.removeChild(g);
        g.destroy();
      }
    });
  }
}

// ───────────────────────── shockwave ─────────────────────────

/**
 * Anillo concéntrico que se expande de 0 a `maxRadius` (default 120)
 * con alpha decreciente. ~500ms.
 */
export function shockwave(
  stage: PIXI.Container,
  x: number,
  y: number,
  color: number,
  maxRadius = 120,
): Promise<void> {
  const g = new PIXI.Graphics();
  g.x = x;
  g.y = y;
  g.zIndex = 50;
  stage.addChild(g);

  const state = { r: 0, a: 0.85 };

  const draw = () => {
    g.clear();
    g.lineStyle(4, color, state.a);
    g.drawCircle(0, 0, state.r);
  };
  draw();

  return new Promise((resolve) => {
    Tweener.add(
      { target: state, duration: 0.5, ease: Easing.easeOutQuad, onUpdate: () => draw() },
      { r: maxRadius, a: 0 },
    ).then(() => {
      if (!g.destroyed) {
        stage.removeChild(g);
        g.destroy();
      }
      resolve();
    });
  });
}

// ───────────────────────── expandingRings ─────────────────────────

/**
 * Múltiples shockwaves escalonados con delay. Para Hypnose / Cry.
 */
export function expandingRings(
  stage: PIXI.Container,
  x: number,
  y: number,
  count: number,
  color: number,
  gapMs = 100,
  maxRadius = 120,
): void {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      void shockwave(stage, x, y, color, maxRadius);
    }, i * gapMs);
  }
}

// ───────────────────────── bombSprite ─────────────────────────

/**
 * Bomba (círculo negro) volando en arco parabólico desde (fromX,fromY) hasta
 * (toX,toY). Resuelve cuando llega.
 */
export function bombSprite(
  stage: PIXI.Container,
  from: { x: number; y: number },
  to: { x: number; y: number },
  speed = 1,
): Promise<void> {
  const g = new PIXI.Graphics();
  g.beginFill(0x1a1a1a, 1);
  g.drawCircle(0, 0, 7);
  g.endFill();
  g.beginFill(0xff5a1f, 1);
  g.drawCircle(0, -7, 2); // mecha encendida
  g.endFill();
  g.x = from.x;
  g.y = from.y;
  g.zIndex = 100;
  stage.addChild(g);

  const duration = 0.45 / speed;
  const arcHeight = 80;
  const startTime = performance.now();

  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(1, elapsed / duration);
      // Posición lineal X, parabólica Y
      g.x = from.x + (to.x - from.x) * t;
      const linearY = from.y + (to.y - from.y) * t;
      const arc = -arcHeight * 4 * t * (1 - t); // parábola invertida
      g.y = linearY + arc;
      g.rotation = t * Math.PI * 2;
      if (t >= 1) {
        if (!g.destroyed) {
          stage.removeChild(g);
          g.destroy();
        }
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// ───────────────────────── explosion ─────────────────────────

/**
 * Combinación de shockwave + partículas radiales naranja-rojo-amarillo.
 * Para impactos de bomba / hammer.
 */
export function explosion(
  stage: PIXI.Container,
  x: number,
  y: number,
  radius = 100,
): void {
  void shockwave(stage, x, y, 0xff8a00, radius);
  // Anillo interno blanco
  void shockwave(stage, x, y, 0xffe5b0, radius * 0.5);
  // Partículas naranja-rojo-amarillo
  const colors = [0xff5a1f, 0xff8a00, 0xffd84a, 0xff2030];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = radius * (0.6 + Math.random() * 0.4);
    const color = colors[Math.floor(Math.random() * colors.length)] ?? 0xff8a00;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 10; // sesgo arriba

    const g = new PIXI.Graphics();
    const r = 3 + Math.random() * 4;
    g.beginFill(color, 1);
    g.drawCircle(0, 0, r);
    g.endFill();
    g.x = x;
    g.y = y;
    g.zIndex = 999;
    stage.addChild(g);

    void Tweener.add(
      { target: g, duration: 0.6 + Math.random() * 0.2, ease: Easing.easeOutQuad },
      { x: x + dx, y: y + dy, alpha: 0 },
    ).then(() => {
      if (!g.destroyed) {
        stage.removeChild(g);
        g.destroy();
      }
    });
  }
}
