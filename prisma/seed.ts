// Brutus v3 — DB seed.
//
// SQLite has no fixtures by default; this script is a no-op for now because
// stat / skill / weapon / pet catalogues live in the `core` package as code,
// not as DB rows. If you ever need pre-seeded brutes for local development,
// drop them in here and call from `npm run prisma:seed -w server`.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Intentionally empty.
  // eslint-disable-next-line no-console
  console.log('[seed] no fixtures to insert');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
