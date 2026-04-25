// Fórmulas de daño / esquiva / bloqueo / contraataque / crítico.
// ref: labrute/server/src/utils/fight/getDamage.ts (línea base de daño con strength scaling)
// ref: labrute/server/src/utils/fight/fightMethods.ts (esquiva, bloqueo, contraataque)
// ref: labrute/core/src/brute/skills.ts (SkillModifiers)
// Versión Brutus: simplificada y determinista vía rng.

import type { Rng } from '../random.js';
import { getWeapon } from '../data/weapons.js';
import type { FighterRuntime } from './skills.js';

export interface AttackOutcome {
  hit: boolean;
  dodged: boolean;
  blocked: boolean;
  damage: number;
  critical: boolean;
  combo: boolean;
}

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/**
 * Probabilidad de esquiva del defensor frente al ataque del rival.
 * Base: agility / (agility + 30) * 0.4 + bonuses por skill/arma.
 * Cap a 0.85 (siempre algo de chance de pegar).
 */
export function dodgeChance(attacker: FighterRuntime, defender: FighterRuntime): number {
  if (attacker.effects.precision) return 0;
  const agi = defender.stats.agility;
  let chance = (agi / (agi + 30)) * 0.4;
  chance += defender.effects.evasion ?? 0;
  const w = defender.weaponId ? getWeapon(defender.weaponId) : undefined;
  if (w?.evasion) chance += w.evasion;
  // accuracy del atacante reduce esquiva
  const accBonus = attacker.effects.accuracy ?? 0;
  chance -= accBonus * 0.5;
  return clamp(chance, 0, 0.85);
}

export function blockChance(_attacker: FighterRuntime, defender: FighterRuntime): number {
  let chance = 0.05;
  chance += defender.effects.block ?? 0;
  const w = defender.weaponId ? getWeapon(defender.weaponId) : undefined;
  if (w?.block) chance += w.block;
  return clamp(chance, 0, 0.85);
}

export function counterChance(attacker: FighterRuntime, defender: FighterRuntime): number {
  let chance = 0.05;
  chance += defender.effects.counter ?? 0;
  if (attacker.netStunTurns > 0) chance += 0.2;
  return clamp(chance, 0, 0.85);
}

export function criticalChance(attacker: FighterRuntime): number {
  let chance = 0.02;
  chance += attacker.effects.criticalChance ?? 0;
  const w = attacker.weaponId ? getWeapon(attacker.weaponId) : undefined;
  if (w?.criticalChance) chance += w.criticalChance;
  return clamp(chance, 0, 0.95);
}

export function comboChance(attacker: FighterRuntime): number {
  let c = attacker.effects.combo ?? 0;
  const w = attacker.weaponId ? getWeapon(attacker.weaponId) : undefined;
  if (w?.combo) c += w.combo;
  return clamp(c, 0, 0.7);
}

/**
 * Calcula el daño base de un ataque.
 * ref: labrute/server/src/utils/fight/getDamage.ts:
 *   base = weapon.damage (o 5 sin arma)
 *   damage = floor( (base + strength*(0.2 + base*0.05)) * (0.8 + rng*0.4) * skillMult )
 */
export function rollDamage(rng: Rng, attacker: FighterRuntime): {
  damage: number;
  critical: boolean;
} {
  const w = attacker.weaponId ? getWeapon(attacker.weaponId) : undefined;
  const base = w?.damage ?? 5;
  let mult = 1;

  // martial arts: solo sin arma
  if (attacker.effects.martialArts && !w) {
    mult *= 1 + (attacker.effects.damageMultiplier ?? 0);
  }
  // weapons master: solo con arma sharp
  if (attacker.effects.weaponsMaster && w?.type === 'sharp') {
    mult *= 1 + (attacker.effects.damageMultiplier ?? 0);
  }
  // damageMultiplier global de skills temerarias / acróbatas
  if (
    !attacker.effects.martialArts &&
    !attacker.effects.weaponsMaster &&
    typeof attacker.effects.damageMultiplier === 'number'
  ) {
    mult *= 1 + attacker.effects.damageMultiplier;
  }

  // fierce brute: x2 si está activo (cada uso consume una carga)
  let fierceBurst = false;
  if (attacker.effects.fierce && attacker.fierceUsesLeft > 0 && rng() < 0.25) {
    mult *= 2;
    attacker.fierceUsesLeft -= 1;
    fierceBurst = true;
  }

  // hammer: x4 (consume único uso)
  let hammerBurst = false;
  if (attacker.effects.hammer && attacker.hammerUsesLeft > 0 && rng() < 0.18) {
    mult *= 4;
    attacker.hammerUsesLeft -= 1;
    hammerBurst = true;
  }

  // strength scaling (port de getDamage.ts)
  const variance = 0.8 + rng() * 0.4; // 0.8..1.2
  const strScale = 0.2 + base * 0.05;
  let dmg = Math.floor((base + attacker.stats.strength * strScale) * variance * mult);

  // crítico
  const critRoll = rng();
  const critChance = criticalChance(attacker);
  let critical = critRoll < critChance;
  if (fierceBurst || hammerBurst) critical = true; // golpe especial cuenta como crítico para narrativa
  if (critical) {
    const critMult = 1.5 + (attacker.effects.criticalDamage ?? 0);
    dmg = Math.floor(dmg * critMult);
  }

  if (dmg < 1) dmg = 1;
  return { damage: dmg, critical };
}

/**
 * Aplica reducción de daño por armadura/skills al recibir un golpe.
 */
export function applyIncomingMitigation(defender: FighterRuntime, raw: number): number {
  let dmg = raw;
  if (defender.effects.ironSkin) {
    dmg = Math.max(1, dmg - 3);
  }
  const taken = defender.effects.damageTaken;
  if (typeof taken === 'number' && taken !== 1) {
    dmg = Math.floor(dmg * taken);
  }
  return Math.max(1, dmg);
}
