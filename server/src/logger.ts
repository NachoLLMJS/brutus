// Structured logging via pino. We deliberately strip `req.body` (could
// contain unsanitised user input) and only keep IDs / paths / status codes.

import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Logger } from 'pino';
import type { HttpLogger } from 'pino-http';
import { env } from './env.js';

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'brutus-server' },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    remove: true,
  },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
});

export const httpLogger: HttpLogger = pinoHttp({
  logger,
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err: Error | undefined) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req: { method?: string; url?: string }) {
      return {
        method: req.method,
        url: req.url,
        // No body, no headers other than what redact left through.
      };
    },
    res(res: { statusCode?: number }) {
      return { statusCode: res.statusCode };
    },
  },
});
