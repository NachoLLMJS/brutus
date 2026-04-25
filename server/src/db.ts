// Prisma client singleton. We lean on `globalThis` so that `tsx watch` reloads
// in dev don't accumulate connections to SQLite (each new client opens a
// handle). In production (single boot) it's just a normal singleton.

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
