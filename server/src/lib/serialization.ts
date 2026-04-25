// (De)serialise between Prisma rows (where JSON-shaped fields are TEXT) and
// the plain JS objects the rest of the app talks in.
//
// SQLite has no native JSON type; rather than scattering JSON.parse calls,
// we centralise the conversion + give us a single place to adopt safer
// parsing later (e.g. zod-validated round-trip).

import type { Brute as PrismaBrute } from '@prisma/client';
import type { Brute as CoreBrute, Stats, Appearance as CoreAppearance } from 'core';

// Re-export para los servicios que ya importan de aquí.
export type Appearance = CoreAppearance;

/**
 * Shape devuelto al cliente: matchea exactamente `core.Brute` para que el
 * tipado sea consistente entre server y client. Agrega `userId` opcional.
 */
export interface BruteSnapshot extends CoreBrute {
  userId: string | null;
}

export type { Stats };

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function deserializeBrute(row: PrismaBrute): BruteSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    seed: row.seed,
    level: row.level,
    xp: row.xp,
    rank: row.rank,
    stats: {
      hp: row.hp,
      strength: row.strength,
      agility: row.agility,
      speed: row.speed,
    },
    skills: safeParse<string[]>(row.skills, []),
    weapons: safeParse<string[]>(row.weapons, []),
    pets: safeParse<string[]>(row.pets, []),
    appearance: safeParse<Appearance>(row.appearance, {
      gender: 'M',
      skin: '#d2a679',
      hair: '#3b1f0e',
      shirt: '#3b3b8a',
      pants: '#1f1f1f',
    }),
    victories: row.victories,
    defeats: row.defeats,
    fightsRemaining: row.fightsRemaining,
    trainingFightsRemaining: row.trainingFightsRemaining,
    defeatsToday: row.defeatsToday,
    lastFightReset: row.lastFightReset.getTime(),
    pupils: [],
    master: row.masterId,
    createdAt: row.createdAt.getTime(),
  };
}

export interface SerializableInput {
  skills?: string[];
  weapons?: string[];
  pets?: string[];
  appearance?: Appearance;
}

export function serializeForPrisma(input: SerializableInput): {
  skills?: string;
  weapons?: string;
  pets?: string;
  appearance?: string;
} {
  return {
    skills: input.skills ? JSON.stringify(input.skills) : undefined,
    weapons: input.weapons ? JSON.stringify(input.weapons) : undefined,
    pets: input.pets ? JSON.stringify(input.pets) : undefined,
    appearance: input.appearance ? JSON.stringify(input.appearance) : undefined,
  };
}
