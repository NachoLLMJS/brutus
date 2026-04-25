// Generic zod validator. Each schema is run synchronously, the parsed/
// transformed value replaces the raw payload so downstream controllers
// can trust the types.

import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

export interface ValidateOptions {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export function validate(opts: ValidateOptions): RequestHandler {
  return (req, _res, next) => {
    try {
      if (opts.params) {
        req.params = opts.params.parse(req.params);
      }
      if (opts.query) {
        // Express types `req.query` as ParsedQs; we replace it after parse.
        const parsed = opts.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsed, writable: true });
      }
      if (opts.body) {
        req.body = opts.body.parse(req.body);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
