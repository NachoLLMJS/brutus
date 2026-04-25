// Runs an 8-brute tournament, picking 7 random opponents from the pool.
//
// Until `core/tournament.ts` is wired, the bracket logic lives here as a
// straight elimination using `simulateCombat`.

import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { bruteSnapshotToCore, mulberry32, simulate } from '../lib/coreBridge.js';
import { deserializeBrute, type BruteSnapshot } from '../lib/serialization.js';

export interface TournamentRound {
  round: number;
  matches: {
    a: { id: string; name: string };
    b: { id: string; name: string };
    winner: 'A' | 'B';
    duration: number;
  }[];
}

export interface TournamentRunResult {
  id: string;
  rounds: TournamentRound[];
  champion: { id: string; name: string };
  ascended: boolean;
}

export async function runTournament(playerId: string): Promise<TournamentRunResult> {
  const player = await prisma.brute.findUnique({ where: { id: playerId } });
  if (!player) throw new HttpError(404, 'brute_not_found');

  const pool = await prisma.brute.findMany({
    where: { id: { not: playerId } },
    take: 50,
  });
  if (pool.length < 7) throw new HttpError(400, 'not_enough_brutes_for_tournament');

  const opponents = [...pool].sort(() => Math.random() - 0.5).slice(0, 7);
  let bracket = [player, ...opponents];

  const rounds: TournamentRound[] = [];
  let roundNum = 1;
  while (bracket.length > 1) {
    const matches: TournamentRound['matches'] = [];
    const next: typeof bracket = [];
    for (let i = 0; i < bracket.length; i += 2) {
      const a = bracket[i]!;
      const b = bracket[i + 1]!;
      const matchSeed = (a.seed ^ b.seed ^ (roundNum * 0x9e3779b1)) >>> 0;
      const aCore = bruteSnapshotToCore(deserializeBrute(a));
      const bCore = bruteSnapshotToCore(deserializeBrute(b));
      const result = simulate(aCore, bCore, mulberry32(matchSeed));
      matches.push({
        a: { id: a.id, name: a.name },
        b: { id: b.id, name: b.name },
        winner: result.winner,
        duration: result.duration,
      });
      next.push(result.winner === 'A' ? a : b);
    }
    rounds.push({ round: roundNum, matches });
    bracket = next;
    roundNum += 1;
  }

  const champion = bracket[0]!;
  const ascended = champion.id === player.id;

  const created = await prisma.tournament.create({
    data: {
      playerId,
      rounds: JSON.stringify(rounds),
      champion: champion.id,
      ascended,
    },
  });

  if (ascended) {
    await prisma.brute.update({
      where: { id: player.id },
      data: { rank: { increment: 1 } },
    });
  }

  return {
    id: created.id,
    rounds,
    champion: { id: champion.id, name: champion.name },
    ascended,
  };
}

export async function getPlayerSnapshot(playerId: string): Promise<BruteSnapshot> {
  const row = await prisma.brute.findUnique({ where: { id: playerId } });
  if (!row) throw new HttpError(404, 'brute_not_found');
  return deserializeBrute(row);
}
