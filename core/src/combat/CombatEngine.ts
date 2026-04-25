// Motor de combate determinista.
// Recibe dos brutos y un rng — devuelve log + resultado, sin mutarlos.
// ref: labrute/server/src/utils/fight/generateFight.ts (orquestación general)
// ref: labrute/server/src/utils/fight/fightMethods.ts (ataque/dodge/block/counter)

import type {
  Brute,
  CombatResult,
  CombatStep,
  FighterSide,
  FighterSnapshot,
  PetState,
  StepAttack,
  StepCounter,
  StepHeal,
  StepPetAttack,
  StepPetDeath,
  StepPetJoin,
  StepRevive,
  StepSkill,
} from '../types.js';
import type { Rng } from '../random.js';
import { getPet } from '../data/pets.js';
import {
  blockChance,
  comboChance,
  counterChance,
  dodgeChance,
  rollDamage,
  applyIncomingMitigation,
} from './damage.js';
import { buildFighter, type FighterRuntime, type PetRuntime } from './skills.js';

const MAX_TURNS = 200;

function buildPets(brute: Brute): PetRuntime[] {
  const pets: PetRuntime[] = [];
  for (const petId of brute.pets) {
    const def = getPet(petId);
    if (!def) continue;
    for (let i = 0; i < def.count; i++) {
      pets.push({
        petId: def.id,
        index: i,
        hp: def.hp,
        hpMax: def.hp,
        alive: true,
        damage: def.damage,
        initiative: def.initiative * 100, // a unidades comparables
      });
    }
  }
  return pets;
}

function snapshot(f: FighterRuntime): FighterSnapshot {
  return {
    side: f.side,
    bruteId: f.bruteId,
    name: f.name,
    hp: f.hp,
    hpMax: f.hpMax,
    alive: f.hp > 0,
    weapon: f.weaponId,
    pets: f.pets.map<PetState>((p) => ({
      petId: p.petId,
      index: p.index,
      hp: p.hp,
      alive: p.alive,
    })),
  };
}

/**
 * Ejecuta el ataque del atacante contra el defensor. Empuja steps al log
 * y retorna true si el defensor murió (HP a 0 sin revival).
 */
function performAttack(
  log: CombatStep[],
  turn: number,
  rng: Rng,
  attacker: FighterRuntime,
  defender: FighterRuntime,
): boolean {
  // dodge
  if (rng() < dodgeChance(attacker, defender)) {
    log.push({
      type: 'dodge', turn,
      attacker: attacker.side, defender: defender.side,
    });
    return false;
  }
  // block
  if (rng() < blockChance(attacker, defender)) {
    log.push({
      type: 'block', turn,
      attacker: attacker.side, defender: defender.side,
    });
    // chance de contraataque tras bloqueo
    if (rng() < counterChance(attacker, defender)) {
      const { damage } = rollDamage(rng, defender);
      const mit = applyIncomingMitigation(attacker, damage);
      attacker.hp = Math.max(0, attacker.hp - mit);
      const counterStep: StepCounter = {
        type: 'counter', turn,
        attacker: attacker.side, defender: defender.side,
        damage: mit, remainingHp: attacker.hp,
      };
      log.push(counterStep);
      if (attacker.hp <= 0) {
        return tryRevive(log, turn, attacker);
      }
    }
    return false;
  }

  // hit
  const { damage, critical } = rollDamage(rng, attacker);
  const mit = applyIncomingMitigation(defender, damage);
  defender.hp = Math.max(0, defender.hp - mit);

  const combo = rng() < comboChance(attacker);
  const atkStep: StepAttack = {
    type: 'attack', turn,
    attacker: attacker.side, defender: defender.side,
    damage: mit,
    weapon: attacker.weaponId,
    critical, combo,
    remainingHp: defender.hp,
  };
  log.push(atkStep);

  // vampirism: cura al atacante
  if (attacker.effects.vampirism && mit > 0) {
    const heal = Math.floor(mit * 0.5);
    if (heal > 0) {
      attacker.hp = Math.min(attacker.hpMax, attacker.hp + heal);
      const healStep: StepHeal = {
        type: 'heal', turn, side: attacker.side,
        amount: heal, remainingHp: attacker.hp,
        source: 'vampirism',
      };
      log.push(healStep);
    }
  }

  if (defender.hp <= 0) {
    return !tryRevive(log, turn, defender);
  }

  // combo: golpe extra
  if (combo) {
    const { damage: cDmg } = rollDamage(rng, attacker);
    const cMit = applyIncomingMitigation(defender, cDmg);
    defender.hp = Math.max(0, defender.hp - cMit);
    const cStep: StepAttack = {
      type: 'attack', turn,
      attacker: attacker.side, defender: defender.side,
      damage: cMit, weapon: attacker.weaponId,
      critical: false, combo: true,
      remainingHp: defender.hp,
    };
    log.push(cStep);
    if (defender.hp <= 0) {
      return !tryRevive(log, turn, defender);
    }
  }

  return false;
}

/**
 * Si el defensor tiene `survival` o `immortal` y aún no se usó, revive con 1 HP / 25%.
 * Retorna true si la pelea terminó (sin revivir).
 */
function tryRevive(log: CombatStep[], turn: number, defender: FighterRuntime): boolean {
  if (defender.alreadyRevived) {
    log.push({ type: 'death', turn, side: defender.side });
    return true;
  }
  if (defender.effects.survival) {
    defender.hp = 1;
    defender.alreadyRevived = true;
    const r: StepRevive = {
      type: 'revive', turn, side: defender.side,
      hp: 1, source: 'survival',
    };
    log.push(r);
    return false;
  }
  if (defender.effects.immortal) {
    defender.hp = Math.floor(defender.hpMax * 0.25);
    defender.alreadyRevived = true;
    const r: StepRevive = {
      type: 'revive', turn, side: defender.side,
      hp: defender.hp, source: 'immortal',
    };
    log.push(r);
    return false;
  }
  log.push({ type: 'death', turn, side: defender.side });
  return true;
}

function petsAttack(
  log: CombatStep[],
  turn: number,
  rng: Rng,
  attacker: FighterRuntime,
  defender: FighterRuntime,
): boolean {
  for (const pet of attacker.pets) {
    if (!pet.alive) continue;
    if (rng() < dodgeChance(attacker, defender)) {
      // pet attack dodged — log silently for brevity (skip)
      continue;
    }
    const dmg = Math.max(1, Math.floor(pet.damage * (0.8 + rng() * 0.4)));
    const mit = applyIncomingMitigation(defender, dmg);
    defender.hp = Math.max(0, defender.hp - mit);
    const step: StepPetAttack = {
      type: 'pet_attack', turn,
      attacker: attacker.side, petId: pet.petId, petIndex: pet.index,
      defender: defender.side, damage: mit, remainingHp: defender.hp,
    };
    log.push(step);
    if (defender.hp <= 0) {
      return !tryRevive(log, turn, defender);
    }
  }
  return false;
}

function maybeRegen(log: CombatStep[], turn: number, f: FighterRuntime): void {
  const regen = f.effects.regen;
  if (typeof regen !== 'number' || regen <= 0) return;
  if (f.hp >= f.hpMax) return;
  const heal = Math.max(1, Math.floor(f.hpMax * regen));
  f.hp = Math.min(f.hpMax, f.hp + heal);
  const step: StepHeal = {
    type: 'heal', turn, side: f.side,
    amount: heal, remainingHp: f.hp,
    source: 'regen',
  };
  log.push(step);
}

/**
 * Simula una pelea entre dos brutos. Función pura: no muta los inputs.
 * Recibe `rng` — usar la misma seed produce el mismo log + winner.
 */
export function simulate(a: Brute, b: Brute, rng: Rng): CombatResult {
  const fighterA = buildFighter(a, 'A');
  const fighterB = buildFighter(b, 'B');
  fighterA.pets = buildPets(a);
  fighterB.pets = buildPets(b);

  const log: CombatStep[] = [];
  log.push({
    type: 'start',
    turn: 0,
    fighters: { A: snapshot(fighterA), B: snapshot(fighterB) },
  });

  // Anuncio de mascotas que entran al combate
  for (const f of [fighterA, fighterB]) {
    for (const p of f.pets) {
      const join: StepPetJoin = {
        type: 'pet_join', turn: 0, side: f.side,
        petId: p.petId, index: p.index, hp: p.hp,
      };
      log.push(join);
    }
  }

  // log skills activas como narrativa al inicio
  for (const f of [fighterA, fighterB]) {
    for (const sid of f.skillIds) {
      const s: StepSkill = { type: 'skill', turn: 0, side: f.side, skillId: sid };
      log.push(s);
    }
  }

  // Determinar el primer atacante (treachery o initiative menor)
  let order: [FighterRuntime, FighterRuntime] =
    fighterA.initiative <= fighterB.initiative ? [fighterA, fighterB] : [fighterB, fighterA];
  if (fighterA.effects.treachery && !fighterB.effects.treachery) {
    order = [fighterA, fighterB];
  } else if (fighterB.effects.treachery && !fighterA.effects.treachery) {
    order = [fighterB, fighterA];
  }

  let turn = 0;
  let winner: FighterSide | null = null;

  while (turn < MAX_TURNS && winner === null) {
    turn += 1;
    for (let i = 0; i < 2; i++) {
      const attacker = order[i] as FighterRuntime;
      const defender = order[1 - i] as FighterRuntime;
      if (attacker.hp <= 0 || defender.hp <= 0) break;

      log.push({ type: 'turn', turn, side: attacker.side });

      // regen al inicio del turno propio
      maybeRegen(log, turn, attacker);

      // si está bajo "net", pierde el turno
      if (attacker.netStunTurns > 0) {
        attacker.netStunTurns -= 1;
        const sk: StepSkill = {
          type: 'skill', turn, side: attacker.side,
          skillId: 'net', detail: 'stunned',
        };
        log.push(sk);
        // mascotas siguen actuando
        if (petsAttack(log, turn, rng, attacker, defender)) {
          winner = attacker.side;
          break;
        }
        continue;
      }

      // tiro de "net" sobre el rival
      if (attacker.effects.net && attacker.netUsesLeft > 0 && rng() < 0.15) {
        attacker.netUsesLeft -= 1;
        defender.netStunTurns = 1;
        const sk: StepSkill = {
          type: 'skill', turn, side: attacker.side,
          skillId: 'net', detail: 'thrown',
        };
        log.push(sk);
      }

      // poción si HP bajo
      if (
        attacker.potionUsesLeft > 0 &&
        attacker.skillIds.includes('tragic_potion') &&
        attacker.hp < attacker.hpMax * 0.4
      ) {
        attacker.potionUsesLeft -= 1;
        const heal = Math.floor(attacker.hpMax * 0.4);
        attacker.hp = Math.min(attacker.hpMax, attacker.hp + heal);
        const step: StepHeal = {
          type: 'heal', turn, side: attacker.side,
          amount: heal, remainingHp: attacker.hp,
          source: 'potion',
        };
        log.push(step);
      }

      // bomba contra mascotas
      if (attacker.effects.bomb && attacker.bombUsesLeft > 0 && defender.pets.some((p) => p.alive)) {
        if (rng() < 0.2) {
          attacker.bombUsesLeft -= 1;
          const sk: StepSkill = {
            type: 'skill', turn, side: attacker.side,
            skillId: 'bomb',
          };
          log.push(sk);
          for (const p of defender.pets) {
            if (!p.alive) continue;
            const dmg = 20 + Math.floor(rng() * 10);
            p.hp -= dmg;
            if (p.hp <= 0) {
              p.alive = false;
              const death: StepPetDeath = {
                type: 'pet_death', turn, side: defender.side,
                petId: p.petId, index: p.index,
              };
              log.push(death);
            }
          }
          // bomba también golpea al defensor
          const dmg2 = 8 + Math.floor(rng() * 8);
          const mit = applyIncomingMitigation(defender, dmg2);
          defender.hp = Math.max(0, defender.hp - mit);
          const atkStep: StepAttack = {
            type: 'attack', turn,
            attacker: attacker.side, defender: defender.side,
            damage: mit, weapon: 'bomb',
            critical: false, combo: false,
            remainingHp: defender.hp,
          };
          log.push(atkStep);
          if (defender.hp <= 0) {
            if (tryRevive(log, turn, defender)) {
              winner = attacker.side;
              break;
            }
          }
        }
      }

      // ataque normal
      const ended = performAttack(log, turn, rng, attacker, defender);
      if (ended || defender.hp <= 0) {
        winner = attacker.side;
        break;
      }

      // swift wind: posible turno extra
      if (attacker.effects.swiftWind && rng() < 0.15 && defender.hp > 0) {
        const ended2 = performAttack(log, turn, rng, attacker, defender);
        if (ended2 || defender.hp <= 0) {
          winner = attacker.side;
          break;
        }
      }

      // ataques de mascotas del atacante
      if (petsAttack(log, turn, rng, attacker, defender)) {
        winner = attacker.side;
        break;
      }
    }
  }

  if (winner === null) {
    // timeout: gana el que tiene más HP %
    const aRatio = fighterA.hp / fighterA.hpMax;
    const bRatio = fighterB.hp / fighterB.hpMax;
    winner = aRatio >= bRatio ? 'A' : 'B';
    log.push({ type: 'end', turn, winner, reason: 'timeout' });
  } else {
    log.push({ type: 'end', turn, winner, reason: 'death' });
  }

  return {
    winner,
    log,
    finalState: {
      A: { hp: fighterA.hp, alive: fighterA.hp > 0 },
      B: { hp: fighterB.hp, alive: fighterB.hp > 0 },
    },
    duration: turn,
  };
}
