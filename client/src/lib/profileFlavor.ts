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
  '12m ago', '38m ago', '1h ago', '2h ago', '4h ago',
  '5h ago', '8h ago', 'Yesterday', '2 days ago', '3 days ago',
];

const LINEAGE_TEMPLATES: readonly ((name: string) => string)[] = [
  (n) =>
    `${n} was born in a forge beneath the earth, where smiths temper steel with prisoner blood. His first memory is the hammer falling on his freshly forged helm. He still has not taken it off.`,
  (n) =>
    `${n} was dragged from the black swamps before he could speak. He learned to fight among wolves. His first words came the day he killed one with his bare hands.`,
  (n) =>
    `They say ${n} never cried at birth. He only clenched his fists. The midwife dropped him on the floor and swore he looked at her as if he knew her. They found her dead three nights later.`,
  (n) =>
    `${n} was the last survivor of a village that burned in a single night. He walked two weeks through ash until he reached the pit. He arrived with a bone knife and a hatred that still has not gone out.`,
  (n) =>
    `The abbey monks pulled ${n} from a well. He had no name. They gave him one and taught him to bleed. When he left, there were seven fresh graves in the cloister.`,
  (n) =>
    `${n} fought in the southern legions before deserting. He sold his armor, his name, and his tongue. Only the edge remained. He sharpens it every night. Not out of habit. For pleasure.`,
];

const RANK_NAMES: readonly string[] = [
  'Initiate', 'Mercenary', 'Soldier', 'Hunter',
  'Sorcerer', 'Gladiator', 'Executioner', 'Butcher',
  'Black Knight', 'Blood Lord',
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
