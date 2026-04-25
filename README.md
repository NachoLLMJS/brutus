# Brutus

Auto-battler con mecánicas porteadas de **El Bruto / MyBrute**, en stack TypeScript moderno. Temática de fantasía oscura. Local primero, web3 después.

## Stack

- **Monorepo** con npm workspaces: `core`, `server`, `client`.
- **`core/`** — lógica del juego compartida (combate, level-up, torneo, datos). TypeScript estricto.
- **`server/`** — Express + Prisma + SQLite. Bind a `127.0.0.1`. Validación con zod.
- **`client/`** — Vite + React + TypeScript + Tailwind. Routing con React Router.

## Setup

Requisitos: Node ≥18.

```bash
npm install
npm run prisma:migrate    # crea dev.db con schema
npm run dev               # levanta server (3001) + client (5173)
```

Browser: <http://localhost:5173>

## Scripts

- `npm run dev` — server + client en paralelo.
- `npm run build` — build de los 3 workspaces.
- `npm test` — unit tests del core.
- `npm run typecheck` — typecheck recursivo.
- `npm run audit:deps` — `npm audit` en todos los workspaces.

## Estructura

```
Brutus/
├── core/            lógica del juego (combate, level-up, datos)
├── server/          API REST con Prisma
├── client/          UI React
└── ATTRIBUTION.md   créditos a LaBrute / MyBrute
```

## Estado

- v3.0 — reescritura sobre stack moderno (en progreso).
- Versiones previas (v1 vanilla JS, v2 vanilla con mejoras) borradas.

## Roadmap

1. Motor de combate fiel al original (porteado de LaBrute).
2. UI de fantasía oscura.
3. Sprites originales.
4. Integración web3 (wagmi + RainbowKit).
5. Brutos como NFTs opcionales.
