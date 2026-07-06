import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { mutationRateLimit, walletRateLimit, bruteRateLimit } from '../middleware/rateLimit.js';
import { requireWallet } from '../middleware/auth.js';
import {
  FightIdParams,
  LevelUpBody,
  StartFightBody,
  applyLevelUp,
  startFight,
} from '../controllers/fights.js';

export const fightsRouter: Router = Router();

// POST /api/brutes/:id/fights — opponent suggestions or actual fight
fightsRouter.post(
  '/:id/fights',
  mutationRateLimit,
  requireWallet,
  walletRateLimit('fight', 18, 60_000),
  bruteRateLimit('fight', 8, 60_000),
  validate({ params: FightIdParams, body: StartFightBody }),
  startFight,
);

fightsRouter.post(
  '/:id/levelup',
  mutationRateLimit,
  requireWallet,
  walletRateLimit('levelup', 10, 60_000),
  bruteRateLimit('levelup', 5, 60_000),
  validate({ params: FightIdParams, body: LevelUpBody }),
  applyLevelUp,
);
