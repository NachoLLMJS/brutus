// Genera flavor data determinístico para Profile v2: bitácora de combates
// recientes y texto de linaje. Seedeado por brute.id, así cada bruto tiene
// su "historia" estable sin que el server tenga que persistirla.

import type { Brute } from 'core';

export interface BattleEntry {
  foe: string;
  level: number;
  when: string;
  result: 'win' | 'loss';
  xp: number;
}

/* PRNG */
function hashId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

const FOE_NAMES: readonly string[] = [
  'Mörgar', 'Sanguineus', 'Drahko', 'Nyxara', 'Kaelen',
  'Theron', 'Vex', 'Ozkr', 'Vorgath', 'Drahko Sangrediez',
  'Krell', 'Ashgar', 'Veil', 'Cinder', 'Husk',
];

const WHEN_LABELS: readonly string[] = [
  'Hace 12m', 'Hace 38m', 'Hace 1h', 'Hace 2h', 'Hace 4h',
  'Hace 5h', 'Hace 8h', 'Ayer', 'Hace 2 días', 'Hace 3 días',
];

const LINEAGE_TEMPLATES: readonly ((name: string) => string)[] = [
  (n) =>
    `${n} nació en una fragua bajo la tierra, donde los herreros templan el acero con sangre de prisioneros. Su primer recuerdo es el martillo cayendo sobre su yelmo recién forjado. Aún no se lo quita.`,
  (n) =>
    `${n} fue arrancado de los pantanos negros antes de poder hablar. Aprendió a luchar entre lobos. Sus primeras palabras las pronunció el día que mató a uno con las manos.`,
  (n) =>
    `Dicen que ${n} nunca lloró al nacer. Solo apretó los puños. La partera lo soltó en el suelo y juró que la miró como si la conociera. La encontraron muerta tres noches después.`,
  (n) =>
    `${n} fue el último superviviente de un pueblo que ardió en una sola noche. Caminó dos semanas por las cenizas hasta llegar a la fosa. Llegó con un cuchillo de hueso y un odio que aún no se apaga.`,
  (n) =>
    `Los monjes de la abadía recogieron a ${n} de un pozo. No tenía nombre. Le pusieron uno y le enseñaron a sangrar. Cuando salió de allí, había siete tumbas frescas en el claustro.`,
  (n) =>
    `${n} luchó en las legiones del sur antes de desertar. Vendió su armadura, su nombre y su lengua. Solo le quedó el filo. Lo afila cada noche. No por costumbre. Por placer.`,
];

const RANK_NAMES: readonly string[] = [
  'Iniciado', 'Mercenario', 'Soldado', 'Cazador',
  'Hechicero', 'Gladiador', 'Verdugo', 'Carnicero',
  'Caballero Negro', 'Señor de la Sangre',
];
export function rankName(rank: number): string {
  const idx = Math.min(RANK_NAMES.length - 1, Math.max(0, rank));
  return RANK_NAMES[idx]!;
}

/* ─── Public API ─── */

export function battleHistoryFor(brute: Brute, count = 5): BattleEntry[] {
  const rng = mulberry32(hashId(`${brute.id}-history`));
  const out: BattleEntry[] = [];
  for (let i = 0; i < count; i++) {
    const foe = pick(rng, FOE_NAMES);
    const lvlOffset = Math.floor(rng() * 11) - 5; // -5..+5
    const level = Math.max(1, brute.level + lvlOffset);
    const when = WHEN_LABELS[Math.min(WHEN_LABELS.length - 1, i + Math.floor(rng() * 2))]!;
    const result: 'win' | 'loss' = rng() < 0.6 ? 'win' : 'loss';
    const xpBase = 20 + Math.floor(rng() * 60);
    const xp = result === 'win' ? xpBase : -Math.floor(xpBase * 0.3);
    out.push({ foe, level, when, result, xp });
  }
  return out;
}

export function lineageFor(brute: Brute): string {
  const rng = mulberry32(hashId(`${brute.id}-lineage`));
  const tpl = pick(rng, LINEAGE_TEMPLATES);
  return tpl(brute.name);
}
