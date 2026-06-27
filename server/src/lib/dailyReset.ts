// Lazy daily reset: si pasaron >24h desde el último reset, restaura los pools.
// Idempotente y race-safe: el WHERE incluye el timestamp original para que dos
// requests concurrentes no se pisen.

import { prisma } from '../db.js';
import type { Brute as PrismaBrute } from '@prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;
const POOL_NORMAL = 3;
const POOL_TRAINING = 10;

export async function maybeResetDaily(row: PrismaBrute): Promise<PrismaBrute> {
  const elapsed = Date.now() - row.lastFightReset.getTime();
  if (elapsed < DAY_MS) return row;

  const result = await prisma.brute.updateMany({
    where: { id: row.id, lastFightReset: row.lastFightReset },
    data: {
      fightsRemaining: POOL_NORMAL,
      trainingFightsRemaining: POOL_TRAINING,
      defeatsToday: 0,
      lastFightReset: new Date(),
    },
  });

  if (result.count === 0) {
    // Race: otro request lo reseteó primero. Recargamos.
    const fresh = await prisma.brute.findUnique({ where: { id: row.id } });
    return fresh ?? row;
  }
  return prisma.brute.findUniqueOrThrow({ where: { id: row.id } });
}
