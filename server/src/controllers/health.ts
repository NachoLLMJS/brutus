import type { RequestHandler } from 'express';

const VERSION = '0.3.0';

export const healthCheck: RequestHandler = (_req, res) => {
  res.json({ ok: true, version: VERSION });
};
