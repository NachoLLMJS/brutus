import type { Brute } from '../src/types.js';

export function makeBrute(overrides: Partial<Brute> = {}): Brute {
  const base: Brute = {
    id: 'b1',
    name: 'Tester',
    seed: 1,
    level: 1,
    xp: 0,
    rank: 0,
    stats: { hp: 100, strength: 10, agility: 10, speed: 10 },
    skills: [],
    weapons: [],
    pets: [],
    appearance: {
      gender: 'M',
      skin: 'pale',
      hair: 'black',
      shirt: 'red',
      pants: 'brown',
    },
    victories: 0,
    defeats: 0,
    fightsRemaining: 6,
    trainingFightsRemaining: 3,
    defeatsToday: 0,
    lastFightReset: 0,
    pupils: [],
    master: null,
    createdAt: 0,
  };
  return {
    ...base,
    ...overrides,
    stats: { ...base.stats, ...(overrides.stats ?? {}) },
    skills: overrides.skills ?? base.skills,
    weapons: overrides.weapons ?? base.weapons,
    pets: overrides.pets ?? base.pets,
  };
}
