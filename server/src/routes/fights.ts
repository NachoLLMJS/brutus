import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { mutationRateLimit } from '../middleware/rateLimit.js';
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
  validate({ params: FightIdParams, body: StartFightBody }),
  startFight,
);

fightsRouter.post(
  '/:id/levelup',
  mutationRateLimit,
  validate({ params: FightIdParams, body: LevelUpBody }),
  applyLevelUp,
);
