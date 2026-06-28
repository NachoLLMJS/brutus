// Adapter: convierte el `CombatResult` que produce nuestro `simulate()`
// (steps simplificados con type='attack'|'dodge'|'block'|...) en el shape de
// `FightLog` que consume el FightViewer Pixi (steps tipo LaBrute con StepType
// enum). El motor de combate no se reescribe — solo se mapea.
//
// Convención de IDs numéricos:
//   1 = fighter A (player), 2 = fighter B (opponent).
//   Pets: 100+sideOffset+petIndex (no usado en MVP, reservado para fase 3).

import type { CombatResult, CombatStep, FighterSide } from '../types.js';
import type { Brute } from '../types.js';
import { getPet } from '../data/pets.js';
import {
  StepType,
  type FightStep,
  type FightLog,
  type FightFighter,
  type FightPet,
  type PetModel,
  type ArriveStep,
  type MoveStep,
  type AttemptHitStep,
  type HitStep,
  type EvadeStep,
  type BlockStep,
  type CounterStep,
  type DeathStep,
  type EndStep,
  type SurviveStep,
  type HealStep,
  type VampirismStep,
  type SkillActivateStep,
  type EquipStep,
} from './types.js';

const ID_A = 1;
const ID_B = 2;
/** Offset numérico para pets: A → 11..19, B → 21..29. */
const PET_BASE_A = 10;
const PET_BASE_B = 20;

function fid(side: FighterSide): number {
  return side === 'A' ? ID_A : ID_B;
}

function buildFighter(side: FighterSide, brute: Brute): FightFighter {
  return {
    id: fid(side),
    side: side === 'A' ? 'left' : 'right',
    bruteId: brute.id,
    name: brute.name,
    gender: brute.gender,
    body: brute.body,
    bodyColors: brute.bodyColors,
    lpc: brute.appearance.lpc,
    maxHp: brute.stats.hp,
  };
}

function startWeapon(brute: Brute): string | undefined {
  return brute.weapons[0];
}

/** Mapea un id del catálogo de Brutus al modelo visual (set de Symbols FLA). */
function petModelFor(petId: string): PetModel {
  if (petId === 'bear') return 'bear';
  if (petId === 'panthers') return 'panther';
  // wolf, mastiff y cualquier otro caen al modelo dog.
  return 'dog';
}

/**
 * Construye la lista de FightPet para ambos lados.
 * - `panthers` instancia 3 entidades (count=3 en el catálogo).
 * - `wolf`/`bear`/`mastiff` instancian 1 entidad cada uno.
 */
function buildPets(bruteA: Brute, bruteB: Brute): FightPet[] {
  const pets: FightPet[] = [];

  const expand = (side: FighterSide, brute: Brute) => {
    const base = side === 'A' ? PET_BASE_A : PET_BASE_B;
    let slot = 1;
    for (const petId of brute.pets) {
      const meta = getPet(petId);
      if (!meta) continue;
      const count = Math.max(1, meta.count ?? 1);
      const model = petModelFor(petId);
      for (let i = 0; i < count && slot <= 9; i++) {
        pets.push({
          id: base + slot,
          side: side === 'A' ? 'left' : 'right',
          petId,
          model,
          name: count > 1 ? `${meta.name} ${i + 1}` : meta.name,
          owner: fid(side),
          indexInOwner: i,
          maxHp: meta.hp,
        });
        slot++;
      }
    }
  };

  expand('A', bruteA);
  expand('B', bruteB);
  return pets;
}

/**
 * Lookup numérico del pet por (side, petId, indexInOwner).
 * Usado al traducir CombatStep `pet_attack` / `pet_death` a FightStep.
 */
function buildPetIdLookup(pets: FightPet[]): (side: FighterSide, petId: string, idx: number) => number | null {
  const map = new Map<string, number>();
  for (const p of pets) {
    const key = `${p.side === 'left' ? 'A' : 'B'}::${p.petId}::${p.indexInOwner}`;
    map.set(key, p.id);
  }
  return (side, petId, idx) => map.get(`${side}::${petId}::${idx}`) ?? null;
}

/**
 * Convierte el `CombatResult` interno a un `FightLog` con steps tipo LaBrute.
 * Es estable: misma `result` produce mismo log.
 */
export function toFightLog(
  bruteA: Brute,
  bruteB: Brute,
  result: CombatResult,
): FightLog {
  const fighters: [FightFighter, FightFighter] = [
    buildFighter('A', bruteA),
    buildFighter('B', bruteB),
  ];
  const start = result.log.find((step): step is Extract<CombatStep, { type: 'start' }> => step.type === 'start');
  if (start) {
    fighters[0].maxHp = start.fighters.A.hpMax;
    fighters[1].maxHp = start.fighters.B.hpMax;
  }
  const pets = buildPets(bruteA, bruteB);
  const findPetId = buildPetIdLookup(pets);
  const steps: FightStep[] = [];

  const weaponOf: Record<FighterSide, string | undefined> = {
    A: startWeapon(bruteA),
    B: startWeapon(bruteB),
  };

  // Arrive de cada pet al inicio (después de los Arrive de los brutos que
  // emitirá el step 'start' del CombatResult).
  let arrivedPets = false;

  for (const step of result.log) {
    pushStepsFor(step, steps, weaponOf, findPetId);
    if (!arrivedPets && step.type === 'start') {
      // Arrive para pets se emite justo después del start (que ya emitió los
      // Arrive de A y B).
      for (const p of pets) {
        steps.push({ a: StepType.Arrive, f: p.id });
      }
      arrivedPets = true;
    }
  }

  return { fighters, pets, steps };
}

function pushStepsFor(
  step: CombatStep,
  out: FightStep[],
  weaponOf: Record<FighterSide, string | undefined>,
  findPetId: (side: FighterSide, petId: string, idx: number) => number | null,
): void {
  switch (step.type) {
    case 'start': {
      // Arrive A y B con sus armas iniciales.
      const arrA: ArriveStep = { a: StepType.Arrive, f: ID_A, w: step.fighters.A.weapon ?? undefined };
      const arrB: ArriveStep = { a: StepType.Arrive, f: ID_B, w: step.fighters.B.weapon ?? undefined };
      out.push(arrA, arrB);
      return;
    }
    case 'turn':
      // No emitimos nada per turn — el siguiente step describe la acción.
      return;
    case 'attack': {
      const f = fid(step.attacker);
      const t = fid(step.defender);
      const w = step.weapon ?? undefined;
      const move: MoveStep = { a: StepType.Move, f, t };
      const att: AttemptHitStep = { a: StepType.AttemptHit, f, t, w };
      const hit: HitStep = {
        a: StepType.Hit,
        f,
        t,
        w,
        d: step.damage,
        hp: step.remainingHp,
        c: step.critical ? 1 : 0,
      };
      out.push(move, att, hit);
      return;
    }
    case 'dodge': {
      const f = fid(step.attacker);
      const t = fid(step.defender);
      const move: MoveStep = { a: StepType.Move, f, t };
      const att: AttemptHitStep = { a: StepType.AttemptHit, f, t, w: weaponOf[step.attacker] };
      const evade: EvadeStep = { a: StepType.Evade, f: t };
      out.push(move, att, evade);
      return;
    }
    case 'block': {
      const f = fid(step.attacker);
      const t = fid(step.defender);
      const move: MoveStep = { a: StepType.Move, f, t };
      const att: AttemptHitStep = { a: StepType.AttemptHit, f, t, w: weaponOf[step.attacker] };
      const block: BlockStep = { a: StepType.Block, f: t };
      out.push(move, att, block);
      return;
    }
    case 'counter': {
      // El defensor contraataca al atacante original.
      const counterer = step.defender;
      const target = step.attacker;
      const c: CounterStep = { a: StepType.Counter, f: fid(counterer), t: fid(target) };
      const hit: HitStep = {
        a: StepType.Hit,
        f: fid(counterer),
        t: fid(target),
        w: weaponOf[counterer],
        d: step.damage,
        hp: step.remainingHp,
      };
      out.push(c, hit);
      return;
    }
    case 'death': {
      const death: DeathStep = { a: StepType.Death, f: fid(step.side) };
      out.push(death);
      return;
    }
    case 'revive': {
      const surv: SurviveStep = { a: StepType.Survive, b: fid(step.side) };
      out.push(surv);
      return;
    }
    case 'heal': {
      if (step.source === 'vampirism') {
        const v: VampirismStep = {
          a: StepType.Vampirism,
          b: fid(step.side),
          t: fid(step.side === 'A' ? 'B' : 'A'),
          d: 0,
          h: step.amount,
          hp: step.remainingHp,
        };
        out.push(v);
      } else {
        const h: HealStep = { a: StepType.Heal, b: fid(step.side), h: step.amount, hp: step.remainingHp };
        out.push(h);
      }
      return;
    }
    case 'skill': {
      const sa: SkillActivateStep = { a: StepType.SkillActivate, b: fid(step.side), s: step.skillId };
      out.push(sa);
      return;
    }
    case 'pet_join':
      // Arrive ya se emite al inicio de toFightLog. Lazy-spawn no implementado
      // todavía: el pet ya está en escena cuando la pelea arranca.
      return;
    case 'pet_attack': {
      const pid = findPetId(step.attacker, step.petId, step.petIndex);
      const target = fid(step.defender);
      if (pid === null) return;
      const move: MoveStep = { a: StepType.Move, f: pid, t: target };
      const att: AttemptHitStep = { a: StepType.AttemptHit, f: pid, t: target };
      const hit: HitStep = {
        a: StepType.Hit,
        f: pid,
        t: target,
        d: step.damage,
        hp: step.remainingHp,
      };
      out.push(move, att, hit);
      return;
    }
    case 'pet_death': {
      const pid = findPetId(step.side, step.petId, step.index);
      if (pid === null) return;
      const death: DeathStep = { a: StepType.Death, f: pid };
      out.push(death);
      return;
    }
    case 'equip': {
      // Mantener el weapon "actual" para los siguientes hits del mismo turno.
      weaponOf[step.side] = step.weaponId;
      out.push({ a: StepType.Equip, b: fid(step.side), w: step.weaponId });
      return;
    }
    case 'throw': {
      // El bruto vuelve a puños — los próximos hits del adapter no llevan w.
      weaponOf[step.side] = undefined;
      out.push({
        a: StepType.Throw,
        f: fid(step.side),
        t: fid(step.side === 'A' ? 'B' : 'A'),
        w: step.weaponId,
        // k: 0 (no recupera) — la tira en serio.
      });
      return;
    }
    case 'trash': {
      weaponOf[step.side] = undefined;
      out.push({ a: StepType.Trash, b: fid(step.side), w: step.weaponId });
      return;
    }
    case 'steal': {
      weaponOf[step.side] = step.weaponId;
      weaponOf[step.target] = undefined;
      out.push({
        a: StepType.Steal,
        b: fid(step.side),
        w: step.weaponId,
        t: fid(step.target),
      });
      return;
    }
    case 'end': {
      const winner = step.winner;
      const loser: FighterSide = winner === 'A' ? 'B' : 'A';
      const end: EndStep = { a: StepType.End, w: fid(winner), l: fid(loser) };
      out.push(end);
      return;
    }
    default: {
      // Compile-time exhaustiveness check — si agregamos CombatStep nuevos,
      // este branch va a romper hasta que mapeemos arriba.
      const _exhaustive: never = step;
      void _exhaustive;
    }
  }
}

// Re-export para conveniencia en el server bridge.
export { type FightLog, type FightStep, StepType };
export type { ArriveStep, MoveStep, AttemptHitStep, HitStep, EvadeStep, BlockStep, CounterStep, DeathStep, EndStep, SurviveStep, HealStep, VampirismStep, SkillActivateStep, EquipStep, FightFighter };
