// Interpretación de skills en combate.
// ref: labrute/core/src/brute/skills.ts (SkillModifiers, SkillDamageModifiers)
// ref: labrute/server/src/utils/fight/getDamage.ts y getFighterStat.ts

import type { Brute, SkillEffects, Skill, Stats } from '../types.js';
import { SKILLS_BY_ID } from '../data/skills.js';

/**
 * Aplica los `statBonus` de cada skill que el bruto posee a sus stats base.
 * No muta — devuelve una copia.
 * ref: labrute/core/src/brute/applySkillModifiers.ts
 */
export function applySkillStatBonuses(stats: Stats, skillIds: readonly string[]): Stats {
  const out: Stats = { ...stats };
  for (const id of skillIds) {
    const skill = SKILLS_BY_ID.get(id);
    if (!skill?.statBonus) continue;
    const flat = skill.statBonus.flat;
    if (flat) {
      if (flat.hp) out.hp += flat.hp;
      if (flat.strength) out.strength += flat.strength;
      if (flat.agility) out.agility += flat.agility;
      if (flat.speed) out.speed += flat.speed;
    }
  }
  // los percent se aplican después de sumar todos los flats
  for (const id of skillIds) {
    const skill = SKILLS_BY_ID.get(id);
    if (!skill?.statBonus) continue;
    const pct = skill.statBonus.percent;
    if (pct) {
      if (pct.hp) out.hp = Math.floor(out.hp * (1 + pct.hp));
      if (pct.strength) out.strength = Math.floor(out.strength * (1 + pct.strength));
      if (pct.agility) out.agility = Math.floor(out.agility * (1 + pct.agility));
      if (pct.speed) out.speed = Math.floor(out.speed * (1 + pct.speed));
    }
  }
  // mínimos
  out.hp = Math.max(1, out.hp);
  out.strength = Math.max(1, out.strength);
  out.agility = Math.max(1, out.agility);
  out.speed = Math.max(1, out.speed);
  return out;
}

/**
 * Combina (suma o multiplica según la propiedad) los effects de todas las skills del bruto.
 */
export function aggregateEffects(skillIds: readonly string[]): SkillEffects {
  const acc: SkillEffects = {};
  const numericKeys: (keyof SkillEffects)[] = [
    'evasion', 'block', 'counter', 'reversal', 'accuracy',
    'criticalChance', 'criticalDamage', 'damageMultiplier',
    'combo', 'initiative', 'regen',
  ];
  const flagKeys: (keyof SkillEffects)[] = [
    'vampirism', 'fierce', 'hammer', 'ironSkin', 'monk', 'weaponsMaster',
    'martialArts', 'survival', 'thief', 'net', 'bomb', 'cryOfTheDamned',
    'shock', 'treachery', 'reckless', 'precision', 'acrobat',
    'swiftWind', 'immortal',
  ];
  // damageTaken se multiplica
  let dmgTaken = 1;

  for (const id of skillIds) {
    const skill = SKILLS_BY_ID.get(id);
    if (!skill?.effects) continue;
    const e = skill.effects;
    for (const k of numericKeys) {
      const v = e[k];
      if (typeof v === 'number') {
        const cur = acc[k];
        (acc[k] as number) = (typeof cur === 'number' ? cur : 0) + v;
      }
    }
    for (const k of flagKeys) {
      const v = e[k];
      if (v === true) (acc[k] as boolean) = true;
    }
    if (typeof e.damageTaken === 'number') {
      dmgTaken *= e.damageTaken;
    }
  }
  acc.damageTaken = dmgTaken;
  return acc;
}

export interface FighterRuntime {
  bruteId: string;
  side: 'A' | 'B';
  name: string;
  stats: Stats;          // stats efectivas (con bonuses)
  hp: number;
  hpMax: number;
  effects: SkillEffects;
  skillIds: readonly string[];
  weaponId: string | null;   // arma activa (puede cambiar si lo desarman)
  weaponPool: string[];      // armas disponibles
  pets: PetRuntime[];
  // estado de combate
  alreadyRevived: boolean;
  fierceUsesLeft: number;
  hammerUsesLeft: number;
  netUsesLeft: number;
  bombUsesLeft: number;
  potionUsesLeft: number;
  netStunTurns: number;     // 0 = libre, >0 = perdiendo turnos
  initiative: number;       // bajos van primero
}

export interface PetRuntime {
  petId: string;
  index: number;
  hp: number;
  hpMax: number;
  alive: boolean;
  damage: number;
  initiative: number;
}

/**
 * Construye el `FighterRuntime` a partir de un Brute.
 * No depende de rng — es determinista.
 */
export function buildFighter(brute: Brute, side: 'A' | 'B'): FighterRuntime {
  const stats = applySkillStatBonuses(brute.stats, brute.skills);
  const effects = aggregateEffects(brute.skills);
  const weaponId = brute.weapons[0] ?? null;
  // import lazy de pets para evitar ciclos
  const pets: PetRuntime[] = [];
  // se cargan en CombatEngine para acceder al catálogo
  // initiative base: a menor speed, mayor initiative number
  const initBase = 1000 - stats.speed * 5;
  return {
    bruteId: brute.id,
    side,
    name: brute.name,
    stats,
    hp: stats.hp,
    hpMax: stats.hp,
    effects,
    skillIds: brute.skills,
    weaponId,
    weaponPool: brute.weapons.slice(),
    pets,
    alreadyRevived: false,
    fierceUsesLeft: effects.fierce ? 2 : 0,
    hammerUsesLeft: effects.hammer ? 1 : 0,
    netUsesLeft: effects.net ? 2 : 0,
    bombUsesLeft: effects.bomb ? 2 : 0,
    potionUsesLeft: 1,
    netStunTurns: 0,
    initiative: initBase - (effects.initiative ?? 0),
  };
}

export type SkillCatalog = ReadonlyMap<string, Skill>;
