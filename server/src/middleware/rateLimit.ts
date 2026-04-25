// Rate-limit applied to mutation endpoints. 30 req/min/IP is more than
// generous for a single human player but blunts script-driven hammering.

import rateLimit from 'express-rate-limit';

export const mutationRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});
