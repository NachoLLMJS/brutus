// PRNG seedable determinista. Mulberry32 — pequeño, rápido, repetible.
// ref: labrute/core/src/utils/random.ts (LaBrute usa djb2 + Math.random;
// nosotros lo reemplazamos por algo seedable end-to-end).

export type Rng = () => number;

/**
 * Mulberry32: PRNG de 32 bits con período 2^32. Determinista para una seed dada.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash djb2-like de string a entero 32 bits, sirve como seed para Rng.
 * ref: labrute/core/src/utils/random.ts (`seedToRandom`)
 */
export function hashStringToSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash >>> 0;
}

/**
 * Entero aleatorio en [min, max] inclusivo. Determinista vía rng.
 */
export function randomInt(rng: Rng, min: number, max: number): number {
  if (min > max) return 0;
  if (min === max) return min;
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Float aleatorio en [min, max).
 */
export function randomFloat(rng: Rng, min: number, max: number): number {
  return rng() * (max - min) + min;
}

/**
 * Escoge un item de una lista usando pesos enteros (`weight` o `odds`).
 * ref: labrute/core/src/utils/weightedRandom.ts
 */
export function pickWeighted<T extends { weight: number }>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('pickWeighted: empty list');
  }
  let total = 0;
  for (const it of items) total += it.weight;
  if (total <= 0) {
    const fallback = items[0];
    if (!fallback) throw new Error('pickWeighted: empty');
    return fallback;
  }
  const r = rng() * total;
  let acc = 0;
  for (const it of items) {
    acc += it.weight;
    if (r < acc) return it;
  }
  // fallback por imprecisión de FP
  const last = items[items.length - 1];
  if (!last) throw new Error('pickWeighted: empty');
  return last;
}

/**
 * Mezcla determinista (Fisher-Yates) — no muta el array original.
 */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i);
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return arr;
}
