import { describe, it, expect } from 'vitest';
import { generateTournament, runTournament } from '../src/index.js';
import type { Brute } from '../src/types.js';
import { makeBrute } from './helpers.js';

function buildPool(): { brutes: Brute[]; map: Map<string, Brute> } {
  const brutes: Brute[] = [];
  for (let i = 0; i < 8; i++) {
    brutes.push(makeBrute({
      id: `b${i}`, name: `Bruto${i}`,
      stats: {
        hp: 80 + i * 5,
        strength: 8 + i,
        agility: 10,
        speed: 10,
      },
    }));
  }
  return { brutes, map: new Map(brutes.map((b) => [b.id, b])) };
}

describe('tournament', () => {
  it('genera bracket de 8 con 4 matches en ronda 1', () => {
    const { brutes } = buildPool();
    const t = generateTournament(1, brutes);
    expect(t.rounds.length).toBe(1);
    expect(t.rounds[0]?.length).toBe(4);
  });

  it('runTournament termina con un campeón', () => {
    const { brutes, map } = buildPool();
    const t = generateTournament(7, brutes);
    const final = runTournament(t, map);
    expect(final.champion).toBeDefined();
    expect(final.champion).not.toBeNull();
    expect(brutes.map((b) => b.id)).toContain(final.champion);
  });

  it('todos los matches tienen log no vacío', () => {
    const { brutes, map } = buildPool();
    const t = generateTournament(11, brutes);
    const final = runTournament(t, map);
    for (const round of final.rounds) {
      for (const match of round) {
        if (match.a && match.b) {
          expect(match.log.length).toBeGreaterThan(0);
          expect(match.winner).not.toBeNull();
        }
      }
    }
  });

  it('determinista: misma seed = mismo campeón', () => {
    const { brutes, map } = buildPool();
    const t1 = runTournament(generateTournament(99, brutes), map);
    const t2 = runTournament(generateTournament(99, brutes), map);
    expect(t1.champion).toBe(t2.champion);
  });

  it('estructura de rondas: 4 -> 2 -> 1', () => {
    const { brutes, map } = buildPool();
    const final = runTournament(generateTournament(3, brutes), map);
    expect(final.rounds.length).toBe(3);
    expect(final.rounds[0]?.length).toBe(4);
    expect(final.rounds[1]?.length).toBe(2);
    expect(final.rounds[2]?.length).toBe(1);
  });
});
