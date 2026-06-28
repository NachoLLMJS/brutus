# Railway deployment notes for Brutus

Brutus is now prepared for a single Railway web service.

The Express server serves both:

- `/api/*` — backend REST API
- `/` and React routes — built frontend from `client/dist`
- `/lpc-combat/*` — LPC combat sprites from `client/public/lpc-combat`

## Railway service settings

Recommended settings:

- Root directory: repository root (`/`)
- Build command: `npm run build`
- Start command: `npm run start:railway`
- Healthcheck path: `/api/health`

These are also encoded in:

`railway.json`

## Required Railway variables

Set these in Railway variables. Do not commit real secrets.

```bash
NODE_ENV=production
HOST=0.0.0.0
# Railway provides PORT automatically.

# SQLite demo/persistent volume mode:
DATABASE_URL=file:/data/brutus.db

# Set this to the final Railway public domain after deploy.
CLIENT_ORIGIN=https://<your-service>.up.railway.app

# Generate with: openssl rand -base64 32
JWT_SECRET=<real-long-random-secret>

LOG_LEVEL=info
WALLET_AUTH_ENABLED=false
BNB_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BRUTUS_COMBAT_REWARDS=0x9b9b801Fef24947D13b850a93B456C03aeed1Aec
BRUTUS_OPERATOR_PRIVATE_KEY=<operator-private-key>
```

## SQLite persistent volume

For the current Railway deployment, SQLite should use a persistent volume.

Railway UI steps:

1. Open the `server` service.
2. Go to `Volumes`.
3. Add/create a volume mounted at:

`/data`

4. Go to `Variables` for the same `server` service.
5. Set:

`DATABASE_URL=file:/data/brutus.db`

6. Redeploy the `server` service.

The production start script now also defaults missing `DATABASE_URL` to:

`file:/data/brutus.db`

and creates the parent directory before Prisma runs. This only becomes truly persistent when Railway has a volume mounted at `/data`.

Without a volume, SQLite data is still ephemeral and can disappear on redeploy/restart.

For real production/mainnet, consider a controlled migration to Postgres before depending on persistent data.

## Build/start validation already proven locally

The Railway-style production smoke was tested locally with:

```bash
NODE_ENV=production \
PORT=4187 \
HOST=127.0.0.1 \
DATABASE_URL=file:./railway-smoke.db \
CLIENT_ORIGIN=http://127.0.0.1:4187 \
JWT_SECRET=railway-smoke-secret-that-is-long-enough \
npm run start
```

Verified:

- `/` returns 200
- `/api/health` returns 200
- `/brute/test-route` returns 200 via SPA fallback
- `/lpc-combat/body/male/halfslash.png` returns 200
- Prisma migrations apply cleanly on a fresh SQLite DB

## Important chain note

The current on-chain addresses are BNB Testnet only (`0x61`). Do not use BNB mainnet while these contract addresses remain testnet addresses.

Before mainnet:

1. Decide final contract version.
2. Deploy from `contracts/src` source.
3. Update frontend/backend addresses/envs.
4. Verify explorer source and constructor args.
5. Test with tiny amounts.
