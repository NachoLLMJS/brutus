// Leveling: curva de XP y elección al subir nivel.
// ref: labrute/core/src/brute/getXPNeeded.ts
// ref: labrute/core/src/brute/getLevelUpChoices.ts

import type { Brute, LevelUpChoice, LevelUpOffer, Stats, StatChoice } from './types.js';
import type { Rng } from './random.js';
import { pickWeighted, randomInt } from './random.js';
import { SKILLS } from './data/skills.js';
import { WEAPONS } from './data/weapons.js';
import { PETS } from './data/pets.js';

const STATS: (keyof Stats)[] = ['hp', 'strength', 'agility', 'speed'];

/** XP necesaria para llegar al siguiente nivel. ref: labrute getXPNeeded.ts */
export function xpToNext(level: number): number {
  return Math.floor(1.2 * level + 3);
}

/** XP total acumulada al alcanzar `level` desde nivel 1. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
}

/**
 * Genera dos opciones para subir de nivel.
 * Una es siempre "stat" (1 stat +2, o 2 stats +1/+1), la otra es perk (skill/weapon/pet)
 * o un segundo stat si todo el catálogo ya está aprendido o el azar lo decide.
 */
export function computeChoices(brute: Brute, rng: Rng): LevelUpOffer {
  // primera opción: perk si hay candidatos
  const availableSkills = SKILLS.filter((s) => !brute.skills.includes(s.id));
  const availableWeapons = WEAPONS.filter((w) => !brute.weapons.includes(w.id));
  const availablePets = PETS.filter((p) => !brute.pets.includes(p.id));

  // probabilidad menor de perk a alto nivel (port de getLevelUpChoices)
  const preventPerkLikely = brute.level >= 80 && randomInt(rng, 0, brute.level) >= 80;

  let first: LevelUpChoice;
  const preventByEmpty = availableSkills.length === 0 && availableWeapons.length === 0 && availablePets.length === 0;
  if (preventPerkLikely || preventByEmpty) {
    first = doubleStatChoice(rng);
  } else {
    // tipo de perk con peso global de catálogo
    const skillWeight = availableSkills.reduce((a, s) => a + s.weight, 0);
    const weaponWeight = availableWeapons.reduce((a, w) => a + w.weight, 0);
    const petWeight = availablePets.reduce((a, p) => a + p.weight, 0);
    const total = skillWeight + weaponWeight + petWeight;
    const r = rng() * total;
    if (r < skillWeight && availableSkills.length > 0) {
      const s = pickWeighted(rng, availableSkills);
      first = { kind: 'skill', skillId: s.id };
    } else if (r < skillWeight + weaponWeight && availableWeapons.length > 0) {
      const w = pickWeighted(rng, availableWeapons);
      first = { kind: 'weapon', weaponId: w.id };
    } else if (availablePets.length > 0) {
      const p = pickWeighted(rng, availablePets);
      first = { kind: 'pet', petId: p.id };
    } else {
      first = doubleStatChoice(rng);
    }
  }

  // segunda opción: siempre +2 a un stat
  const second: StatChoice = {
    kind: 'stat',
    stat: STATS[randomInt(rng, 0, STATS.length - 1)] as keyof Stats,
    amount: 2,
  };

  // si la primera ya era stat, la segunda debe ser distinta forma
  if (first.kind === 'stat') {
    return { first, second };
  }
  return { first, second };
}

function doubleStatChoice(rng: Rng): StatChoice {
  const a = STATS[randomInt(rng, 0, STATS.length - 1)] as keyof Stats;
  let b = STATS[randomInt(rng, 0, STATS.length - 1)] as keyof Stats;
  let safety = 8;
  while (b === a && safety-- > 0) {
    b = STATS[randomInt(rng, 0, STATS.length - 1)] as keyof Stats;
  }
  return { kind: 'stat', stat: a, amount: 1, secondStat: b, secondAmount: 1 };
}

/**
 * Aplica un `LevelUpChoice` a un bruto y devuelve una copia.
 * Se asume que la decisión de subir de nivel ya se tomó (xp >= xpToNext).
 */
export function applyChoice(brute: Brute, choice: LevelUpChoice): Brute {
  const next: Brute = {
    ...brute,
    stats: { ...brute.stats },
    skills: brute.skills.slice(),
    weapons: brute.weapons.slice(),
    pets: brute.pets.slice(),
    pupils: brute.pupils.slice(),
  };
  next.level += 1;
  // resta xp consumida
  next.xp = Math.max(0, brute.xp - xpToNext(brute.level));

  switch (choice.kind) {
    case 'stat':
      next.stats[choice.stat] += choice.amount;
      if (choice.secondStat && typeof choice.secondAmount === 'number') {
        next.stats[choice.secondStat] += choice.secondAmount;
      }
      break;
    case 'skill':
      if (!next.skills.includes(choice.skillId)) next.skills.push(choice.skillId);
      else next.stats.strength += 1;
      break;
    case 'weapon':
      if (!next.weapons.includes(choice.weaponId)) next.weapons.push(choice.weaponId);
      else next.stats.agility += 1;
      break;
    case 'pet':
      if (!next.pets.includes(choice.petId)) next.pets.push(choice.petId);
      else next.stats.speed += 1;
      break;
  }
  return next;
}

/** Suma XP. No sube nivel automáticamente — eso se hace al elegir. */
export function addXp(brute: Brute, amount: number): Brute {
  return { ...brute, xp: brute.xp + Math.max(0, amount) };
}

/** True si el bruto puede subir de nivel ya. */
export function canLevelUp(brute: Brute): boolean {
  return brute.xp >= xpToNext(brute.level);
}
