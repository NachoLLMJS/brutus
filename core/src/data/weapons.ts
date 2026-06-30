// Catálogo de armas — porteado de `labrute/core/src/brute/weapons.ts`.
// Reescribimos en formato propio (los stats originales son tuplas por tier;
// nosotros usamos el tier medio como balance por defecto).
// Nombres y descripciones en español, IDs en inglés snake_case.

import type { Weapon } from '../types.js';

export const WEAPONS: readonly Weapon[] = [
  {
    id: 'knife', name: 'Knife',
    description: 'Short, fast, precise blade. Good for combos.',
    damage: 10, speedMod: 1.6, accuracy: 0.95, weight: 80,
    range: 'melee', reach: 0, criticalChance: 0.25, combo: 0.4,
    type: 'fast',
  },
  {
    id: 'whip', name: 'Whip',
    description: 'Long reach, ideal for keeping distance.',
    damage: 15, speedMod: 0.7, accuracy: 0.8, weight: 3,
    range: 'melee', reach: 5, criticalChance: 0, evasion: 0.35, combo: 0.4,
    disarm: 0.35, type: 'long',
  },
  {
    id: 'noodle_bowl', name: 'Noodle Bowl',
    description: 'Improvised but heavy thrown weapon.',
    damage: 15, speedMod: 2.0, accuracy: 0.9, weight: 1,
    range: 'thrown', reach: 0, criticalChance: 0, combo: 0.4,
    type: 'thrown',
  },
  {
    id: 'sai', name: 'Sai',
    description: 'Forked blade, excellent for disarming.',
    damage: 12, speedMod: 1.5, accuracy: 0.9, weight: 6,
    range: 'melee', reach: 0, criticalChance: 0.05, block: 0.35,
    disarm: 0.8, combo: 0.35, type: 'fast',
  },
  {
    id: 'hatchet', name: 'Hatchet',
    description: 'Small axe, balanced between speed and damage.',
    damage: 22, speedMod: 0.65, accuracy: 0.85, weight: 40,
    range: 'melee', reach: 1, criticalChance: 0.25, type: 'sharp',
  },
  {
    id: 'axe', name: 'Axe',
    description: 'Heavy and slow, but hits like a meteor.',
    damage: 75, speedMod: 0.42, accuracy: 0.7, weight: 3,
    range: 'melee', reach: 1, criticalChance: 0, disarm: 0.15,
    type: 'heavy',
  },
  {
    id: 'scimitar', name: 'Scimitar',
    description: 'Curved saber with a lethal edge.',
    damage: 15, speedMod: 1.2, accuracy: 0.85, weight: 6,
    range: 'melee', reach: 1, criticalChance: 0.1, combo: 0.25,
    type: 'sharp',
  },
  {
    id: 'mighty_hammer', name: 'Mighty Hammer',
    description: 'Solid head that crushes bones.',
    damage: 40, speedMod: 0.45, accuracy: 0.75, weight: 6,
    range: 'melee', reach: 1, criticalChance: 0.1, disarm: 0.15,
    type: 'heavy',
  },
  {
    id: 'halberd', name: 'Halberd',
    description: 'Spear with an axe head. Long reach.',
    damage: 30, speedMod: 0.55, accuracy: 0.8, weight: 2,
    range: 'melee', reach: 4, criticalChance: 0, combo: 0.15,
    disarm: 0.15, type: 'long',
  },
  {
    id: 'lance', name: 'Spear',
    description: 'Sharp point for impaling at range.',
    damage: 16, speedMod: 0.85, accuracy: 0.85, weight: 40,
    range: 'melee', reach: 3, criticalChance: 0.25, disarm: 0.15,
    type: 'long',
  },
  {
    id: 'trident', name: 'Trident',
    description: 'Three points, three times the pain.',
    damage: 18, speedMod: 0.7, accuracy: 0.85, weight: 10,
    range: 'melee', reach: 3, criticalChance: 0.1, disarm: 0.3,
    type: 'long',
  },
  {
    id: 'nunchaku', name: 'Nunchaku',
    description: 'Two sticks joined by a chain, fast and tricky.',
    damage: 9, speedMod: 1.3, accuracy: 0.85, weight: 6,
    range: 'melee', reach: 1, criticalChance: 0.15, combo: 0.45,
    type: 'fast',
  },
  {
    id: 'broadsword', name: 'Broadsword',
    description: 'Classic combat sword, balanced.',
    damage: 13, speedMod: 0.85, accuracy: 0.85, weight: 100,
    range: 'melee', reach: 1, criticalChance: 0.35, block: 0.25,
    disarm: 0.2, type: 'sharp',
  },
  {
    id: 'shuriken', name: 'Shuriken',
    description: 'Throwing stars. Fast but weak.',
    damage: 5, speedMod: 2.5, accuracy: 0.85, weight: 8,
    range: 'thrown', reach: 0, criticalChance: 0, combo: 0.4,
    type: 'thrown',
  },
  {
    id: 'mug', name: 'Mug',
    description: 'A heavy mug. Do not underestimate its weight.',
    damage: 12, speedMod: 1.2, accuracy: 0.85, weight: 1,
    range: 'melee', reach: 0, criticalChance: 0, evasion: 0.2,
    combo: 0.5, type: 'fast',
  },
  {
    id: 'bo_staff', name: 'Bo Staff',
    description: 'Long staff, defensive and precise.',
    damage: 8, speedMod: 1.1, accuracy: 0.9, weight: 70,
    range: 'melee', reach: 3, criticalChance: 0.25, block: 0.3,
    reversal: 0.35, disarm: 0.3, type: 'long',
  },
  {
    id: 'katana', name: 'Katana',
    description: 'Japanese blade with a perfect edge.',
    damage: 20, speedMod: 1.0, accuracy: 0.9, weight: 4,
    range: 'melee', reach: 2, criticalChance: 0.3, combo: 0.2,
    type: 'sharp',
  },
  {
    id: 'flail', name: 'Flail',
    description: 'Spiked ball on a chain. Brutal but unruly.',
    damage: 42, speedMod: 0.45, accuracy: 0.8, weight: 4,
    range: 'melee', reach: 1, criticalChance: 0, combo: 0.35,
    type: 'heavy',
  },
  {
    id: 'morning_star', name: 'Morning Star',
    description: 'Spiked mace. Medieval punishment.',
    damage: 30, speedMod: 0.65, accuracy: 0.85, weight: 6,
    range: 'melee', reach: 1, criticalChance: 0.1, disarm: 0.15,
    type: 'heavy',
  },
  {
    id: 'dagger', name: 'Dagger',
    description: 'Tiny blade for treacherous strikes.',
    damage: 8, speedMod: 1.8, accuracy: 0.95, weight: 50,
    range: 'melee', reach: 0, criticalChance: 0.3, combo: 0.45,
    type: 'fast',
  },
  {
    id: 'claymore', name: 'Claymore',
    description: 'Giant sword. Slow but crushing.',
    damage: 36, speedMod: 0.5, accuracy: 0.75, weight: 4,
    range: 'melee', reach: 2, criticalChance: 0.1, type: 'sharp',
  },
  {
    id: 'rapier', name: 'Rapier',
    description: 'Needle-fine point for precise thrusts.',
    damage: 11, speedMod: 1.3, accuracy: 0.95, weight: 8,
    range: 'melee', reach: 2, criticalChance: 0.15, combo: 0.25,
    type: 'sharp',
  },
  {
    id: 'crossbow', name: 'Crossbow',
    description: 'Ranged bolts. Slow reload, reliable hit.',
    damage: 14, speedMod: 0.8, accuracy: 0.95, weight: 5,
    range: 'thrown', reach: 0, criticalChance: 0.2,
    type: 'thrown',
  },
  {
    id: 'chain_whip', name: 'Chain Whip',
    description: 'Lethal links that entangle the rival.',
    damage: 13, speedMod: 0.9, accuracy: 0.8, weight: 4,
    range: 'melee', reach: 4, criticalChance: 0.05, disarm: 0.4,
    combo: 0.3, type: 'long',
  },
  {
    id: 'frying_pan', name: 'Frying Pan',
    description: 'Cooking and combat, all in one.',
    damage: 22, speedMod: 0.85, accuracy: 0.8, weight: 1,
    range: 'melee', reach: 1, criticalChance: 0, block: 0.45,
    type: 'heavy',
  },
  {
    id: 'wrench', name: 'Wrench',
    description: 'Heavy tool turned weapon.',
    damage: 14, speedMod: 0.95, accuracy: 0.85, weight: 8,
    range: 'melee', reach: 1, criticalChance: 0.1, disarm: 0.25,
    type: 'blunt',
  },
  {
    id: 'fan', name: 'Fan',
    description: 'Sharp blades hidden in silk.',
    damage: 6, speedMod: 2.2, accuracy: 0.85, weight: 2,
    range: 'melee', reach: 0, criticalChance: 0, evasion: 0.65,
    combo: 0.5, reversal: 0.55, type: 'fast',
  },
] as const;

export const WEAPONS_BY_ID: ReadonlyMap<string, Weapon> = new Map(
  WEAPONS.map((w) => [w.id, w] as const),
);

export function getWeapon(id: string): Weapon | undefined {
  return WEAPONS_BY_ID.get(id);
}
