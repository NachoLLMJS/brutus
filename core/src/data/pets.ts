// Pet catalogue. Gameplay still uses the existing Brutus pet system: pets are
// unlocked/owned by id, enter combat as independent entities, attack during
// their owner's turns, have HP, and can die. Marketplace/on-chain ownership will
// later decide which of these ids a wallet can equip.

import type { Pet } from '../types.js';

export const PETS: readonly Pet[] = [
  {
    id: 'doux_dino',
    name: 'Doux Dino',
    description: 'Common blue dino. Fast starter pet with light bite damage.',
    hp: 38,
    strength: 14,
    agility: 22,
    speed: 26,
    count: 1,
    weight: 12,
    damage: 6,
    initiative: 0.14,
  },
  {
    id: 'mort_dino',
    name: 'Mort Dino',
    description: 'Tough red dino. Better damage and HP for mid-tier fights.',
    hp: 62,
    strength: 27,
    agility: 18,
    speed: 20,
    count: 1,
    weight: 8,
    damage: 9,
    initiative: 0.42,
  },
  {
    id: 'tard_dino',
    name: 'Tard Dino',
    description: 'Heavy orange dino. Slow, sturdy, and hard-hitting.',
    hp: 88,
    strength: 38,
    agility: 14,
    speed: 15,
    count: 1,
    weight: 5,
    damage: 12,
    initiative: 0.8,
  },
  {
    id: 'vita_dino',
    name: 'Vita Dino',
    description: 'Premium green dino. Best current pet: fast, tanky, and lethal.',
    hp: 118,
    strength: 52,
    agility: 28,
    speed: 27,
    count: 1,
    weight: 2,
    damage: 16,
    initiative: 1.35,
  },
] as const;

export const PETS_BY_ID: ReadonlyMap<string, Pet> = new Map(
  PETS.map((p) => [p.id, p] as const),
);

export function getPet(id: string): Pet | undefined {
  return PETS_BY_ID.get(id);
}
