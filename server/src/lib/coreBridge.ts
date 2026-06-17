// Thin facade over the `core` workspace.
//
// Re-exports the symbols the server actually uses, plus two helpers that
// don't belong in core itself:
//   - `generateInitialStats(name)`: rolls starting stats + a starter skill
//     and weapon for a brand-new brute, derived deterministically from the
//     name via core's mulberry32/hashStringToSeed.
//   - `bruteSnapshotToCore(...)`: lifts a server-side Prisma row +
//     deserialized JSON fields into the `core.Brute` shape that
//     `core.simulate` and `core.computeChoices` expect.

import {
  hashStringToSeed,
  mulberry32,
  pickWeighted,
  SKILLS,
  WEAPONS,
  getRandomBody,
  getRandomColors,
  type Brute as CoreBrute,
  type BruteGender,
  type Rng,
} from 'core';
import type { BruteSnapshot } from './serialization.js';

export {
  // PRNG
  mulberry32,
  hashStringToSeed,
  randomInt,
  randomFloat,
  pickWeighted,
  shuffle,
  // Combat
  simulate,
  // Catalogs
  SKILLS,
  WEAPONS,
  PETS,
  getSkill,
  getWeapon,
  getPet,
  // Leveling
  xpToNext,
  totalXpForLevel,
  computeChoices,
  applyChoice,
  addXp,
  canLevelUp,
  // Tournament
  generateTournament,
  runTournamentNextRound,
  runTournament,
} from 'core';

export type {
  Brute as CoreBrute,
  Skill,
  Weapon,
  Pet,
  LevelUpChoice,
  LevelUpOffer,
  Tournament,
  TournamentMatch,
  CombatStep,
  CombatResult,
  FighterSide,
  Rng,
} from 'core';

// Light-weight starter weapons (low weight in catalog → flavourful, balanced
// for a level-1 brute). All IDs verified against core/src/data/weapons.ts.
const STARTER_WEAPON_IDS: readonly string[] = ['knife', 'dagger', 'mug'] as const;

export interface InitialStats {
  seed: number;
  hp: number;
  strength: number;
  agility: number;
  speed: number;
  skills: string[];
  weapons: string[];
  pets: string[];
  gender: BruteGender;
  body: string;
  bodyColors: string;
}

/**
 * Roll starting stats + visual identity (gender/body/colors) for a freshly-
 * created brute. Determined by `name` so creating "Foo" twice yields the same
 * starter, including appearance.
 *
 * Optional `overrides` allows the CharacterCreator to pin gender or
 * gender+colors while still rolling the rest deterministically.
 */
export function generateInitialStats(
  name: string,
  overrides: Partial<{ gender: BruteGender; body: string; bodyColors: string }> = {},
): InitialStats {
  // Mask to 31 bits so the value fits Prisma's signed Int32 column.
  // mulberry32 only consumes the low 32 bits, so dropping the sign bit is
  // a no-op for determinism.
  const seed = hashStringToSeed(name) & 0x7fffffff;
  const rng: Rng = mulberry32(seed);
  const hp = 50 + Math.floor(rng() * 31); // 50..80
  const strength = 3 + Math.floor(rng() * 5); // 3..7
  const agility = 2 + Math.floor(rng() * 5); // 2..6
  const speed = 2 + Math.floor(rng() * 5); // 2..6

  const skill = pickWeighted(rng, SKILLS).id;
  const starterWeapons = WEAPONS.filter((w) => STARTER_WEAPON_IDS.includes(w.id));
  const weaponPool = starterWeapons.length > 0 ? starterWeapons : WEAPONS;
  const weapon = pickWeighted(rng, weaponPool).id;

  // Visual identity. Gender 50/50 desde la seed; body+colors aleatorios
  // (la seed avanza por el rng compartido, así son determinísticos).
  const gender: BruteGender = overrides.gender ?? (rng() < 0.5 ? 'male' : 'female');
  const body = overrides.body ?? getRandomBody(gender, rng);
  const bodyColors = overrides.bodyColors ?? getRandomColors(gender, rng);

  return {
    seed,
    hp,
    strength,
    agility,
    speed,
    skills: [skill],
    weapons: [weapon],
    pets: [],
    gender,
    body,
    bodyColors,
  };
}

/**
 * Adapt a server `BruteSnapshot` (Prisma row deserialized) into the
 * `core.Brute` shape consumed by `simulate` / `computeChoices`.
 */
export function bruteSnapshotToCore(snap: BruteSnapshot): CoreBrute {
  return {
    id: snap.id,
    name: snap.name,
    seed: snap.seed,
    level: snap.level,
    xp: snap.xp,
    rank: snap.rank,
    stats: { ...snap.stats },
    skills: snap.skills.slice(),
    weapons: snap.weapons.slice(),
    pets: snap.pets.slice(),
    appearance: snap.appearance,
    gender: snap.gender,
    body: snap.body,
    bodyColors: snap.bodyColors,
    victories: snap.victories,
    defeats: snap.defeats,
    fightsRemaining: snap.fightsRemaining,
    trainingFightsRemaining: snap.trainingFightsRemaining,
    defeatsToday: snap.defeatsToday,
    lastFightReset: snap.lastFightReset,
    pupils: snap.pupils,
    master: snap.master,
    createdAt: snap.createdAt,
  };
}
