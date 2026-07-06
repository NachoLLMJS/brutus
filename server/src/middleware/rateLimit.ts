// Rate-limit applied to mutation endpoints. Keep IP limits and add lightweight
// in-memory wallet/brute buckets for game actions. This resets on deploy/restart,
// which is fine as a throttle layer; DB rules still enforce hard limits.

import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

export const mutationRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function takeBucket(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function cleanBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

setInterval(cleanBuckets, 60_000).unref();

export function walletRateLimit(action: string, limit: number, windowMs: number): RequestHandler {
  return (req, res, next) => {
    const wallet = req.wallet;
    if (!wallet) {
      next();
      return;
    }
    if (!takeBucket(`wallet:${action}:${wallet}`, limit, windowMs)) {
      res.status(429).json({ error: 'wallet_rate_limited' });
      return;
    }
    next();
  };
}

export function bruteRateLimit(action: string, limit: number, windowMs: number): RequestHandler {
  return (req, res, next) => {
    const id = typeof req.params.id === 'string' ? req.params.id : undefined;
    if (!id) {
      next();
      return;
    }
    if (!takeBucket(`brute:${action}:${id}`, limit, windowMs)) {
      res.status(429).json({ error: 'brute_rate_limited' });
      return;
    }
    next();
  };
}
