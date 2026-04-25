// Catálogo de mascotas — porteado de `labrute/core/src/brute/pets.ts`.
// Tomamos el tier medio como balance.
// IDs en inglés; nombres y descripciones en español.

import type { Pet } from '../types.js';

export const PETS: readonly Pet[] = [
  {
    id: 'wolf',
    name: 'Lobo',
    description: 'Bestia feroz, ágil y mortal. Acompaña al bruto al combate.',
    hp: 16,
    strength: 8,
    agility: 7,
    speed: 5,
    count: 1,
    weight: 8,
    damage: 6,
    initiative: 0.1,
  },
  {
    id: 'bear',
    name: 'Oso',
    description: 'Coloso lento pero brutal. Cada zarpazo es devastador.',
    hp: 120,
    strength: 45,
    agility: 4,
    speed: 3,
    count: 1,
    weight: 1,
    damage: 10,
    initiative: 3.6,
  },
  {
    id: 'panthers',
    name: 'Panteras',
    description: 'Trío de felinos veloces que atacan en jauría.',
    hp: 30,
    strength: 28,
    agility: 20,
    speed: 28,
    count: 3,
    weight: 1,
    damage: 6,
    initiative: 0.6,
  },
  {
    id: 'mastiff',
    name: 'Mastín',
    description: 'Perro de presa, leal y robusto.',
    hp: 22,
    strength: 10,
    agility: 6,
    speed: 5,
    count: 1,
    weight: 4,
    damage: 7,
    initiative: 0.2,
  },
] as const;

export const PETS_BY_ID: ReadonlyMap<string, Pet> = new Map(
  PETS.map((p) => [p.id, p] as const),
);

export function getPet(id: string): Pet | undefined {
  return PETS_BY_ID.get(id);
}
