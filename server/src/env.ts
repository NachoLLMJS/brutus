// Loads + validates environment variables at boot.
//
// Failing here is preferable to failing mid-request: if a required var is
// missing or malformed we crash the process loudly with a zod report so the
// dev sees it immediately.

import { z } from 'zod';

function defaultHost(): string {
  return process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('3001')
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(1).max(65535)),
  HOST: z.string().default(defaultHost()),
  DATABASE_URL: z.string().min(1).default('file:/data/brutus.db'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16).default('dev-only-not-for-production-do-not-use'),
  WALLET_AUTH_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  BNB_TESTNET_RPC_URL: z.string().url().default('https://data-seed-prebsc-1-s1.binance.org:8545/'),
  BRUTUS_OPERATOR_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  BRUTUS_COMBAT_REWARDS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).default('0x79182dEF2B8662F2F932B358bbd0F4Ab6496fe8F'),
});

export type Env = z.infer<typeof EnvSchema>;

const PLACEHOLDER_JWT_SECRETS = new Set<string>([
  'dev-only-not-for-production-do-not-use',
  'replace-me-with-openssl-rand-base64-32',
]);

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail-loud: fields are listed with paths so the dev can fix `.env`.
    // eslint-disable-next-line no-console
    console.error('[env] invalid configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration. See logs above.');
  }
  // Refuse to boot with a placeholder JWT_SECRET in production. This is
  // checked even though JWT auth isn't wired yet, because the dependency
  // gets added later and a forgotten placeholder is exactly how secrets
  // ship to prod.
  if (
    parsed.data.NODE_ENV === 'production' &&
    PLACEHOLDER_JWT_SECRETS.has(parsed.data.JWT_SECRET)
  ) {
    throw new Error(
      '[env] JWT_SECRET is set to a placeholder value while NODE_ENV=production. ' +
        'Generate a real secret with `openssl rand -base64 32` and set it in .env.',
    );
  }
  return parsed.data;
}

export const env: Env = loadEnv();
