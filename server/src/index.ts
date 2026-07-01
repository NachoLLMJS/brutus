// Entry point. Loads env, configures middleware, mounts routes, binds to
// 127.0.0.1 in development and 0.0.0.0 in production/Railway unless HOST
// is explicitly configured. In production it can also serve the built React app.
// Touch this entrypoint when Railway's watched paths need to rebuild bundled client assets.
// Docs/landing refresh: 2026-07-01 landing-fullscreen-intro.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './env.js';
import { logger, httpLogger } from './logger.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const bnbTestnetRpcOrigin = new URL(env.BNB_TESTNET_RPC_URL).origin;

app.disable('x-powered-by');
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "'unsafe-eval'"],
        "connect-src": [
          "'self'",
          bnbTestnetRpcOrigin,
        ],
      },
    },
  }),
);
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
    maxAge: 600,
  }),
);
app.use(express.json({ limit: '32kb' }));
app.use(httpLogger);

app.use('/api', apiRouter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistDir = path.resolve(__dirname, '../../client/dist');
const clientIndexFile = path.join(clientDistDir, 'index.html');

if (fs.existsSync(clientIndexFile)) {
  app.use(express.static(clientDistDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(clientIndexFile);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(
    { host: env.HOST, port: env.PORT, env: env.NODE_ENV, clientOrigin: env.CLIENT_ORIGIN },
    'brutus_server_listening',
  );
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting_down');
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'shutdown_error');
      process.exit(1);
    }
    process.exit(0);
  });
  // Force-exit if close hangs (e.g., open SQLite handle).
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
