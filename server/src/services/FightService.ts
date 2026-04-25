// Generates opponents, runs server-side combat (via core), persists the
// log, applies XP/level-up deltas. The client only ever receives the
// resulting log + updated brute snapshot.

import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  applyChoice,
  bruteSnapshotToCore,
  computeChoices,
  mulberry32,
  simulate,
  xpToNext,
  type CombatResult,
  type CombatStep,
  type LevelUpChoice,
  type LevelUpOffer,
} from '../lib/coreBridge.js';
import {
  deserializeBrute,
  serializeForPrisma,
  type BruteSnapshot,
} from '../lib/serialization.js';
import { maybeResetDaily } from '../lib/dailyReset.js';

export type FightType = 'normal' | 'training';

export interface FightResult {
  combat: {
    id: string;
    winner: 'A' | 'B';
    log: CombatStep[];
    duration: number;
    fightType: FightType;
    opponent: { id: string; name: string };
  };
  brute: BruteSnapshot;
  leveledUp: boolean;
  levelUpChoices?: LevelUpOffer;
  dayEnded: boolean;
}

const XP_WIN_NORMAL = 2;
const XP_WIN_TRAINING = 1;
const XP_LOSS = 0;
const DAILY_DEFEAT_LIMIT = 3;

/**
 * Returns up to 3 random opponents within +/- 2 levels of the player.
 * Excludes self. If pool is too small, widens silently.
 * Returns full Brute snapshots (matching `core.Brute`) so the client can
 * render BruteCards directly.
 */
export async function suggestOpponents(playerId: string): Promise<BruteSnapshot[]> {
  const found = await prisma.brute.findUnique({ where: { id: playerId } });
  if (!found) throw new HttpError(404, 'brute_not_found');
  const player = await maybeResetDaily(found);

  const close = await prisma.brute.findMany({
    where: {
      id: { not: playerId },
      level: { gte: Math.max(1, player.level - 2), lte: player.level + 2 },
    },
    take: 30,
  });
  const pool = close.length >= 3
    ? close
    : await prisma.brute.findMany({ where: { id: { not: playerId } }, take: 30 });

  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  return shuffled.map((row) => deserializeBrute(row));
}

export interface FightInput {
  playerId: string;
  opponentId: string;
  fightType: FightType;
}

export async function runFight(input: FightInput): Promise<FightResult> {
  const foundPlayer = await prisma.brute.findUnique({ where: { id: input.playerId } });
  if (!foundPlayer) throw new HttpError(404, 'brute_not_found');
  const player = await maybeResetDaily(foundPlayer);
  const opponent = await prisma.brute.findUnique({ where: { id: input.opponentId } });
  if (!opponent) throw new HttpError(404, 'opponent_not_found');
  if (player.id === opponent.id) throw new HttpError(400, 'cannot_fight_self');

  // Daily caps
  if (input.fightType === 'normal' && player.fightsRemaining <= 0) {
    throw new HttpError(429, 'no_fights_remaining');
  }
  if (input.fightType === 'training' && player.trainingFightsRemaining <= 0) {
    throw new HttpError(429, 'no_training_fights_remaining');
  }
  if (player.defeatsToday >= DAILY_DEFEAT_LIMIT) {
    throw new HttpError(400, 'day_ended');
  }

  const playerSnap = deserializeBrute(player);
  const opponentSnap = deserializeBrute(opponent);
  const playerCore = bruteSnapshotToCore(playerSnap);
  const opponentCore = bruteSnapshotToCore(opponentSnap);

  const fightSeed = (player.seed ^ opponent.seed) >>> 0;
  const result: CombatResult = simulate(playerCore, opponentCore, mulberry32(fightSeed));

  const playerWon = result.winner === 'A';
  const xpGain = playerWon
    ? input.fightType === 'training'
      ? XP_WIN_TRAINING
      : XP_WIN_NORMAL
    : XP_LOSS;

  // Compute level / xp deltas server-side.
  let newXp = player.xp + xpGain;
  let newLevel = player.level;
  let leveledUp = false;
  while (newXp >= xpToNext(newLevel)) {
    newXp -= xpToNext(newLevel);
    newLevel += 1;
    leveledUp = true;
  }

  const fightsRemainingDelta = input.fightType === 'normal' ? -1 : 0;
  const trainingDelta = input.fightType === 'training' ? -1 : 0;
  const newDefeatsToday = playerWon ? player.defeatsToday : player.defeatsToday + 1;
  const dayEnded =
    newDefeatsToday >= DAILY_DEFEAT_LIMIT ||
    (input.fightType === 'normal' && player.fightsRemaining + fightsRemainingDelta <= 0);

  const [combatRow, updated] = await prisma.$transaction([
    prisma.combat.create({
      data: {
        bruteAId: player.id,
        bruteBId: opponent.id,
        winner: result.winner,
        log: JSON.stringify(result.log),
        fightType: input.fightType,
      },
    }),
    prisma.brute.update({
      where: { id: player.id },
      data: {
        xp: newXp,
        level: newLevel,
        victories: { increment: playerWon ? 1 : 0 },
        defeats: { increment: playerWon ? 0 : 1 },
        defeatsToday: { increment: playerWon ? 0 : 1 },
        fightsRemaining: { increment: fightsRemainingDelta },
        trainingFightsRemaining: { increment: trainingDelta },
      },
    }),
  ]);

  const snapshot = deserializeBrute(updated);
  let choices: LevelUpOffer | undefined;
  if (leveledUp) {
    const updatedCore = bruteSnapshotToCore(snapshot);
    const choiceSeed = (updated.seed ^ (newLevel * 0x9e3779b1)) >>> 0;
    choices = computeChoices(updatedCore, mulberry32(choiceSeed));
  }

  return {
    combat: {
      id: combatRow.id,
      winner: result.winner,
      log: result.log,
      duration: result.duration,
      fightType: input.fightType,
      opponent: { id: opponent.id, name: opponent.name },
    },
    brute: snapshot,
    leveledUp,
    levelUpChoices: choices,
    dayEnded,
  };
}

export async function applyLevelUp(
  bruteId: string,
  choice: LevelUpChoice,
): Promise<BruteSnapshot> {
  const row = await prisma.brute.findUnique({ where: { id: bruteId } });
  if (!row) throw new HttpError(404, 'brute_not_found');

  const snap = deserializeBrute(row);
  const before = bruteSnapshotToCore(snap);
  const after = applyChoice(before, choice);

  const serialized = serializeForPrisma({
    skills: after.skills,
    weapons: after.weapons,
    pets: after.pets,
  });

  const updated = await prisma.brute.update({
    where: { id: bruteId },
    data: {
      level: after.level,
      xp: after.xp,
      hp: after.stats.hp,
      strength: after.stats.strength,
      agility: after.stats.agility,
      speed: after.stats.speed,
      skills: serialized.skills ?? row.skills,
      weapons: serialized.weapons ?? row.weapons,
      pets: serialized.pets ?? row.pets,
    },
  });
  return deserializeBrute(updated);
}
