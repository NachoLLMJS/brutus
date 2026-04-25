// Central error middleware.
//
// Rules:
// - Never leak stack traces to the client.
// - Always respond `{ error: <code> }` with a stable, machine-readable code.
// - Log the full error (including stack) server-side for debugging.

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'not_found' });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    logger.warn({ err: err.flatten(), path: req.path }, 'validation_failed');
    res.status(400).json({ error: 'invalid_request', issues: err.flatten().fieldErrors });
    return;
  }

  if (err instanceof HttpError) {
    logger.warn({ code: err.code, status: err.status, path: req.path }, 'http_error');
    res.status(err.status).json({ error: err.code });
    return;
  }

  // Unknown error: log full detail, return generic envelope.
  logger.error({ err, path: req.path }, 'unhandled_error');
  res.status(500).json({ error: 'internal_error' });
};
