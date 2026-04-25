// Torneos: bracket de 8 con simulación determinista.

import type { Brute, Tournament, TournamentMatch } from './types.js';
import { simulate } from './combat/CombatEngine.js';
import { mulberry32, shuffle } from './random.js';

/**
 * Genera un bracket de torneo. Si participants.length < 8, rellena con `byes` (null).
 * Si > 8, se truncan los excedentes — se asume que el caller seleccionó 8 brutos.
 */
export function generate(seed: number, participants: readonly Brute[]): Tournament {
  const rng = mulberry32(seed);
  const slots = 8;
  const ids = participants.slice(0, slots).map((b) => b.id);
  while (ids.length < slots) ids.push('');
  const shuffled = shuffle(rng, ids);

  const round1: TournamentMatch[] = [];
  for (let i = 0; i < slots; i += 2) {
    round1.push({
      round: 1,
      index: i / 2,
      a: shuffled[i] || null,
      b: shuffled[i + 1] || null,
      winner: null,
      log: [],
    });
  }

  return {
    id: `tour_${seed}`,
    seed,
    participants: shuffled.filter((s) => s !== '') as string[],
    rounds: [round1],
    champion: null,
  };
}

/**
 * Corre la siguiente ronda del torneo. Muta una copia del torneo y devuelve la nueva versión.
 */
export function runNextRound(
  tournament: Tournament,
  brutes: ReadonlyMap<string, Brute>,
): Tournament {
  if (tournament.champion) return tournament;
  const lastRound = tournament.rounds[tournament.rounds.length - 1];
  if (!lastRound) return tournament;

  // si la última ronda aún no se corrió, correrla
  const pending = lastRound.some((m) => m.winner === null && (m.a !== null || m.b !== null));
  if (pending) {
    const nextRound: TournamentMatch[] = lastRound.map((m, idx) => runMatch(m, brutes, tournament.seed, idx));
    const updated: Tournament = {
      ...tournament,
      rounds: tournament.rounds.slice(0, -1).concat([nextRound]),
    };
    // si solo había un match resuelto → campeón
    if (nextRound.length === 1 && nextRound[0]?.winner) {
      updated.champion = nextRound[0].winner;
    }
    return updated;
  }

  // si la última ronda ya está corrida pero no hay campeón, generar la siguiente
  const winners = lastRound.map((m) => m.winner).filter((w): w is string => !!w);
  if (winners.length <= 1) {
    return { ...tournament, champion: winners[0] ?? null };
  }
  const newRoundIdx = tournament.rounds.length + 1;
  const newRound: TournamentMatch[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    newRound.push({
      round: newRoundIdx,
      index: i / 2,
      a: winners[i] ?? null,
      b: winners[i + 1] ?? null,
      winner: null,
      log: [],
    });
  }
  return { ...tournament, rounds: tournament.rounds.concat([newRound]) };
}

function runMatch(
  match: TournamentMatch,
  brutes: ReadonlyMap<string, Brute>,
  seed: number,
  matchIdx: number,
): TournamentMatch {
  if (match.winner) return match;
  const a = match.a ? brutes.get(match.a) : undefined;
  const b = match.b ? brutes.get(match.b) : undefined;
  // bye: pasa el que esté
  if (a && !b) return { ...match, winner: a.id };
  if (b && !a) return { ...match, winner: b.id };
  if (!a || !b) return { ...match, winner: null };

  // seed combinada para que cada match sea repetible pero distinto
  const matchSeed = (seed ^ (match.round * 1000 + matchIdx)) >>> 0;
  const rng = mulberry32(matchSeed);
  const result = simulate(a, b, rng);
  const winnerId = result.winner === 'A' ? a.id : b.id;
  return { ...match, winner: winnerId, log: result.log };
}

/**
 * Corre el torneo completo y devuelve el estado final.
 */
export function run(tournament: Tournament, brutes: ReadonlyMap<string, Brute>): Tournament {
  let t = tournament;
  let safety = 32;
  while (!t.champion && safety-- > 0) {
    const beforeSig = JSON.stringify(
      t.rounds.map((r) => r.map((m) => [m.winner, m.a, m.b])),
    );
    t = runNextRound(t, brutes);
    const afterSig = JSON.stringify(
      t.rounds.map((r) => r.map((m) => [m.winner, m.a, m.b])),
    );
    if (beforeSig === afterSig) {
      // no hubo progreso real, salir para evitar loop
      break;
    }
  }
  return t;
}
