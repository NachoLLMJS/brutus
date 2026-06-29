// Generates opponents, runs server-side combat (via core), persists the
// log, applies XP/level-up deltas. The client only ever receives the
// resulting log + updated brute snapshot.

import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { logger } from '../logger.js';
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
import { toFightLog, type FightLog } from 'core';
import {
  deserializeBrute,
  serializeForPrisma,
  type BruteSnapshot,
} from '../lib/serialization.js';
import { maybeResetDaily } from '../lib/dailyReset.js';
import { combatRewardFightId, recordCombatRewardWinner } from './OnChainService.js';

export type FightType = 'normal' | 'training';

export interface FightResult {
  combat: {
    id: string;
    winner: 'A' | 'B';
    log: CombatStep[];
    duration: number;
    fightType: FightType;
    opponent: { id: string; name: string };
    /** FightLog en el shape que consume el FightViewer Pixi. */
    fightLog: FightLog;
    reward?: {
      eligible: boolean;
      fightId?: string;
      winnerWallet?: string;
      recordedTxHash?: string;
      reason?: string;
    };
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
const OPPONENT_SUGGESTION_LIMIT = 8;

/**
 * Returns visible lobby opponents from real saved brutes.
 * Prefer close-level brutes from other wallets and order newest first so newly
 * created skins appear on the board immediately. If the pool is too small,
 * widen progressively and only then allow same-wallet fallbacks.
 */
export async function suggestOpponents(playerId: string): Promise<BruteSnapshot[]> {
  const found = await prisma.brute.findUnique({ where: { id: playerId } });
  if (!found) throw new HttpError(404, 'brute_not_found');
  const player = await maybeResetDaily(found);

  const closeLevel = { gte: Math.max(1, player.level - 2), lte: player.level + 2 };
  const newest = { createdAt: 'desc' as const };
  const otherWallet = player.ownerWallet ? { ownerWallet: { not: player.ownerWallet } } : {};

  const pools = [
    await prisma.brute.findMany({
      where: {
        id: { not: playerId },
        level: closeLevel,
        ...otherWallet,
      },
      orderBy: newest,
      take: 50,
    }),
    await prisma.brute.findMany({
      where: {
        id: { not: playerId },
        ...otherWallet,
      },
      orderBy: newest,
      take: 50,
    }),
    await prisma.brute.findMany({
      where: {
        id: { not: playerId },
        level: closeLevel,
      },
      orderBy: newest,
      take: 50,
    }),
    await prisma.brute.findMany({
      where: { id: { not: playerId } },
      orderBy: newest,
      take: 50,
    }),
  ];

  const byId = new Map<string, (typeof pools)[number][number]>();
  for (const pool of pools) {
    for (const row of pool) {
      if (!byId.has(row.id)) byId.set(row.id, row);
      if (byId.size >= OPPONENT_SUGGESTION_LIMIT) break;
    }
    if (byId.size >= OPPONENT_SUGGESTION_LIMIT) break;
  }

  return [...byId.values()].slice(0, OPPONENT_SUGGESTION_LIMIT).map((row) => deserializeBrute(row));
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

  // Daily caps only apply to normal reward-eligible fights. Training is sparring:
  // it never consumes daily attempts and remains available even after the normal day ends.
  if (input.fightType === 'normal' && player.fightsRemaining <= 0) {
    throw new HttpError(429, 'no_fights_remaining');
  }
  if (input.fightType === 'normal' && player.defeatsToday >= DAILY_DEFEAT_LIMIT) {
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
  const newDefeatsToday = input.fightType === 'normal' && !playerWon
    ? player.defeatsToday + 1
    : player.defeatsToday;
  const dayEnded = input.fightType === 'normal' && (
    newDefeatsToday >= DAILY_DEFEAT_LIMIT ||
    player.fightsRemaining + fightsRemainingDelta <= 0
  );

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
        defeatsToday: { increment: input.fightType === 'normal' && !playerWon ? 1 : 0 },
        fightsRemaining: { increment: fightsRemainingDelta },
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

  const fightLog = toFightLog(playerCore, opponentCore, result);

  let reward: FightResult['combat']['reward'] = { eligible: false, reason: playerWon ? 'recording_unavailable' : 'player_lost' };
  if (playerWon && input.fightType === 'normal') {
    if (!player.ownerWallet) {
      reward = { eligible: false, reason: 'winner_wallet_missing' };
    } else {
      const fightId = combatRewardFightId(combatRow.id);
      try {
        const recordedTxHash = await recordCombatRewardWinner(fightId, player.ownerWallet);
        await prisma.combat.update({
          where: { id: combatRow.id },
          data: {
            rewardFightId: fightId,
            rewardWinnerWallet: player.ownerWallet,
            rewardRecordedTxHash: recordedTxHash,
          },
        });
        reward = {
          eligible: true,
          fightId,
          winnerWallet: player.ownerWallet,
          recordedTxHash,
        };
      } catch (err) {
        const reason = err instanceof HttpError ? err.code : 'reward_record_failed';
        logger.warn(
          {
            combatId: combatRow.id,
            rewardFightId: fightId,
            winnerWallet: player.ownerWallet,
            reason,
          },
          'combat_reward_record_failed',
        );
        reward = {
          eligible: false,
          winnerWallet: player.ownerWallet,
          reason,
        };
      }
    }
  } else if (playerWon && input.fightType === 'training') {
    reward = { eligible: false, reason: 'training_fight_no_bnb_reward' };
  }

  return {
    combat: {
      id: combatRow.id,
      winner: result.winner,
      log: result.log,
      duration: result.duration,
      fightType: input.fightType,
      opponent: { id: opponent.id, name: opponent.name },
      fightLog,
      reward,
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
