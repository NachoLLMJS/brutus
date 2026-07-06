// Generates opponents, runs server-side combat (via core), persists the
// log, applies XP/level-up deltas. The client only ever receives the
// resulting log + updated brute snapshot.

import { createHash, randomBytes } from 'node:crypto';
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordCombatRewardWinnerWithRetry(fightId: string, winnerWallet: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await recordCombatRewardWinner(fightId, winnerWallet);
    } catch (err) {
      lastError = err;
      const code = err instanceof HttpError ? err.code : 'unknown_reward_record_error';
      logger.warn({ fightId, winnerWallet, attempt, code }, 'combat_reward_record_attempt_failed');
      if (code === 'fight_already_recorded') throw err;
      if (attempt < 3) await sleep(750 * attempt);
    }
  }
  throw lastError;
}

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
const XP_WIN_TRAINING = 0;
const XP_LOSS = 0;
const DAILY_DEFEAT_LIMIT = 3;
const OPPONENT_SUGGESTION_LIMIT = 8;
const MATCH_TICKET_TTL_MS = 5 * 60 * 1000;
const NORMAL_REMATCH_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type SuggestedOpponent = BruteSnapshot & { matchTicket: string };

function secureFightSeed(playerSeed: number, opponentSeed: number, fightType: FightType): number {
  const digest = createHash('sha256')
    .update(`${playerSeed}:${opponentSeed}:${fightType}:${Date.now()}:${randomBytes(16).toString('hex')}`)
    .digest();
  return digest.readUInt32BE(0);
}

function pairWhere(a: string, b: string) {
  return {
    OR: [
      { bruteAId: a, bruteBId: b },
      { bruteAId: b, bruteBId: a },
    ],
  };
}

/**
 * Returns visible lobby opponents from real saved brutes.
 * Prefer close-level brutes from other wallets and order newest first so newly
 * created skins appear on the board immediately. If the pool is too small,
 * widen progressively and only then allow same-wallet fallbacks.
 */
export async function suggestOpponents(playerId: string, wallet: string, fightType: FightType): Promise<SuggestedOpponent[]> {
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

  const candidates = [...byId.values()].filter((row) => {
    if (fightType !== 'normal') return true;
    if (!player.ownerWallet || !row.ownerWallet) return true;
    return row.ownerWallet.toLowerCase() !== player.ownerWallet.toLowerCase();
  });
  const selected = candidates.slice(0, OPPONENT_SUGGESTION_LIMIT);
  await prisma.matchTicket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const expiresAt = new Date(Date.now() + MATCH_TICKET_TTL_MS);
  const tickets = await Promise.all(selected.map((row) => prisma.matchTicket.create({
    data: {
      playerId,
      opponentId: row.id,
      wallet: wallet.toLowerCase(),
      fightType,
      expiresAt,
    },
  })));
  return selected.map((row, index) => ({ ...deserializeBrute(row), matchTicket: tickets[index]!.id }));
}

export interface FightInput {
  playerId: string;
  opponentId: string;
  fightType: FightType;
  wallet: string;
  matchTicket: string;
}

export async function runFight(input: FightInput): Promise<FightResult> {
  const foundPlayer = await prisma.brute.findUnique({ where: { id: input.playerId } });
  if (!foundPlayer) throw new HttpError(404, 'brute_not_found');
  const player = await maybeResetDaily(foundPlayer);
  const opponent = await prisma.brute.findUnique({ where: { id: input.opponentId } });
  if (!opponent) throw new HttpError(404, 'opponent_not_found');
  if (player.id === opponent.id) throw new HttpError(400, 'cannot_fight_self');

  const now = new Date();
  const ticket = await prisma.matchTicket.findUnique({ where: { id: input.matchTicket } });
  if (!ticket) throw new HttpError(400, 'match_ticket_required');
  if (ticket.usedAt) throw new HttpError(409, 'match_ticket_used');
  if (ticket.expiresAt <= now) throw new HttpError(410, 'match_ticket_expired');
  if (
    ticket.playerId !== player.id
    || ticket.opponentId !== opponent.id
    || ticket.fightType !== input.fightType
    || ticket.wallet.toLowerCase() !== input.wallet.toLowerCase()
  ) {
    throw new HttpError(403, 'match_ticket_mismatch');
  }

  if (input.fightType === 'normal') {
    if (player.ownerWallet && opponent.ownerWallet && player.ownerWallet.toLowerCase() === opponent.ownerWallet.toLowerCase()) {
      throw new HttpError(400, 'same_wallet_fights_disabled');
    }
    const recent = await prisma.combat.findFirst({
      where: {
        fightType: 'normal',
        createdAt: { gte: new Date(Date.now() - NORMAL_REMATCH_COOLDOWN_MS) },
        ...pairWhere(player.id, opponent.id),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (recent) throw new HttpError(429, 'opponent_cooldown_active');
  }

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

  const fightSeed = secureFightSeed(player.seed, opponent.seed, input.fightType);
  const result: CombatResult = simulate(playerCore, opponentCore, mulberry32(fightSeed));

  const playerWon = result.winner === 'A';
  const xpGain = playerWon
    ? input.fightType === 'training'
      ? XP_WIN_TRAINING
      : XP_WIN_NORMAL
    : XP_LOSS;

  // Accumulate XP server-side. The actual level increment happens only when the
  // owner applies one of the server-issued pending choices.
  const newXp = player.xp + xpGain;
  const newLevel = player.level;
  const leveledUp = newXp >= xpToNext(player.level);

  const fightsRemainingDelta = input.fightType === 'normal' ? -1 : 0;
  const newDefeatsToday = input.fightType === 'normal' && !playerWon
    ? player.defeatsToday + 1
    : player.defeatsToday;
  const dayEnded = input.fightType === 'normal' && (
    newDefeatsToday >= DAILY_DEFEAT_LIMIT ||
    player.fightsRemaining + fightsRemainingDelta <= 0
  );

  const [combatRow, updated] = await prisma.$transaction(async (tx) => {
    const consumedTicket = await tx.matchTicket.updateMany({
      where: { id: ticket.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumedTicket.count === 0) throw new HttpError(409, 'match_ticket_used');

    if (input.fightType === 'normal') {
      const consumed = await tx.brute.updateMany({
        where: {
          id: player.id,
          fightsRemaining: { gt: 0 },
          defeatsToday: { lt: DAILY_DEFEAT_LIMIT },
        },
        data: {
          xp: newXp,
          level: newLevel,
          victories: { increment: playerWon ? 1 : 0 },
          defeats: { increment: playerWon ? 0 : 1 },
          normalVictories: { increment: playerWon ? 1 : 0 },
          normalDefeats: { increment: playerWon ? 0 : 1 },
          defeatsToday: { increment: playerWon ? 0 : 1 },
          fightsRemaining: { decrement: 1 },
        },
      });
      if (consumed.count === 0) throw new HttpError(429, 'no_fights_remaining');
    } else {
      await tx.brute.update({
        where: { id: player.id },
        data: {
          xp: newXp,
          level: newLevel,
        },
      });
    }

    const combat = await tx.combat.create({
      data: {
        bruteAId: player.id,
        bruteBId: opponent.id,
        winner: result.winner,
        log: JSON.stringify(result.log),
        fightType: input.fightType,
      },
    });
    const fresh = await tx.brute.findUniqueOrThrow({ where: { id: player.id } });
    return [combat, fresh] as const;
  });

  const snapshot = deserializeBrute(updated);
  let choices: LevelUpOffer | undefined;
  if (leveledUp) {
    const updatedCore = bruteSnapshotToCore(snapshot);
    const choiceSeed = (updated.seed ^ ((newLevel + 1) * 0x9e3779b1)) >>> 0;
    choices = computeChoices(updatedCore, mulberry32(choiceSeed));
    await prisma.brute.update({
      where: { id: player.id },
      data: {
        pendingLevelUpChoices: JSON.stringify(choices),
        pendingLevelUpLevel: player.level,
        pendingLevelUpNonce: combatRow.id,
      },
    });
  }

  const fightLog = toFightLog(playerCore, opponentCore, result);

  let reward: FightResult['combat']['reward'] = { eligible: false, reason: playerWon ? 'recording_unavailable' : 'player_lost' };
  if (playerWon && input.fightType === 'normal') {
    if (!player.ownerWallet) {
      reward = { eligible: false, reason: 'winner_wallet_missing' };
    } else {
      const fightId = combatRewardFightId(combatRow.id);
      try {
        const recordedTxHash = await recordCombatRewardWinnerWithRetry(fightId, player.ownerWallet);
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
  if (!row.pendingLevelUpChoices || row.pendingLevelUpLevel !== row.level) {
    throw new HttpError(400, 'no_pending_levelup');
  }
  if (row.xp < xpToNext(row.level)) {
    throw new HttpError(400, 'not_enough_xp_for_levelup');
  }

  let offer: LevelUpOffer;
  try {
    offer = JSON.parse(row.pendingLevelUpChoices) as LevelUpOffer;
  } catch {
    throw new HttpError(500, 'pending_levelup_corrupt');
  }
  if (!choiceMatches(choice, offer.first) && !choiceMatches(choice, offer.second)) {
    throw new HttpError(400, 'invalid_levelup_choice');
  }

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
      pendingLevelUpChoices: null,
      pendingLevelUpLevel: null,
      pendingLevelUpNonce: null,
    },
  });
  return deserializeBrute(updated);
}

function choiceMatches(a: LevelUpChoice, b: LevelUpChoice): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
