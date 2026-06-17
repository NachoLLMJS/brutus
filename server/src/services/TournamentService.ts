// Runs an 8-brute tournament, picking 7 random opponents from the pool.
//
// Until `core/tournament.ts` is wired, the bracket logic lives here as a
// straight elimination using `simulateCombat`.

import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { bruteSnapshotToCore, mulberry32, simulate } from '../lib/coreBridge.js';
import { toFightLog, type FightLog } from 'core';
import { deserializeBrute, type BruteSnapshot } from '../lib/serialization.js';

interface TournamentBrute {
  id: string;
  name: string;
  gender: 'male' | 'female';
  body: string;
  bodyColors: string;
  maxHp: number;
}

export interface TournamentRound {
  round: number;
  matches: {
    a: TournamentBrute;
    b: TournamentBrute;
    winner: 'A' | 'B';
    duration: number;
    /** Log animable consumido por FightStage en el cliente. */
    fightLog: FightLog;
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
      const fightLog = toFightLog(aCore, bCore, result);
      matches.push({
        a: bruteToTournament(a),
        b: bruteToTournament(b),
        winner: result.winner,
        duration: result.duration,
        fightLog,
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
    // Ascenso suave: rank+1, level/xp resetean, pero stats/skills/weapons/pets
    // y todo lo demás se conservan (a diferencia del v2 que re-rolleaba todo).
    await prisma.brute.update({
      where: { id: player.id },
      data: {
        rank: { increment: 1 },
        level: 1,
        xp: 0,
      },
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

/** Reduce un row de Prisma al subset que el cliente necesita para renderizar. */
function bruteToTournament(row: {
  id: string;
  name: string;
  gender: string;
  body: string;
  bodyColors: string;
  hp: number;
}): TournamentBrute {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender === 'female' ? 'female' : 'male',
    body: row.body,
    bodyColors: row.bodyColors,
    maxHp: row.hp,
  };
}
