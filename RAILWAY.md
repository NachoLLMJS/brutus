# Railway deployment notes for Brutus

Brutus is a monorepo. Railway may auto-detect every workspace as a service, but only two deployable services are expected:

- `server` — Express API
- `client` — Vite static frontend

Do not deploy these as web services:

- `core` — shared game logic package
- `brutus-fla-parser` — local parser/assets package

## Server service

Recommended Railway settings:

- Root directory: repository root (`/`)
- Build command: `npm install && npm run build -w core && npm run build -w server`
- Start command: `npm run start:railway -w server`

Required variables:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT` — Railway provides this automatically
- `DATABASE_URL` — use Railway Postgres for production
- `CLIENT_ORIGIN=https://<client-service>.up.railway.app`
- `JWT_SECRET=<real-long-random-secret>`
- `BNB_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/`
- `BRUTUS_COMBAT_REWARDS=0x22703D0153133450067C2A310D07d44f1Af7584a`
- `BRUTUS_OPERATOR_PRIVATE_KEY=<operator-private-key>`

Important: the on-chain UI currently targets BNB Testnet only (`0x61`). Do not use BNB mainnet while these contract addresses are testnet addresses.

## Client service

Recommended Railway settings:

- Root directory: repository root (`/`)
- Build command: `npm install && npm run build -w core && npm run build -w client`
- Start command: `npm run start -w client`
- Output directory after build: `client/dist`

Required variables:

- `VITE_API_BASE_URL=https://<server-service>.up.railway.app/api`

## Database warning

The repo is still configured for local SQLite in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

For real Railway production, migrate this to PostgreSQL in a controlled step and attach Railway Postgres. SQLite can work only for temporary demos and should not be trusted for persistent production data.

## Deploy order

1. Add Railway Postgres or decide demo-only SQLite.
2. Deploy `server` first.
3. Copy the server public URL into `client` as `VITE_API_BASE_URL`.
4. Deploy `client`.
5. Copy the client public URL into `server` as `CLIENT_ORIGIN`.
6. Redeploy `server`.
7. Verify:
   - `https://<server>/api/health`
   - client loads
   - create paid brute on BNB Testnet
   - fight win claim precheck / claim flow
