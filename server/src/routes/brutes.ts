import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { mutationRateLimit } from '../middleware/rateLimit.js';
import { requireWallet } from '../middleware/auth.js';
import {
  BruteIdParams,
  CreateBruteBody,
  LeaderboardQuery,
  ListBrutesQuery,
  createBrute,
  getBrute,
  getPupils,
  leaderboard,
  listBrutes,
  setPets,
  SetPetsBody,
} from '../controllers/brutes.js';

export const brutesRouter: Router = Router();

brutesRouter.get('/', validate({ query: ListBrutesQuery }), listBrutes);
brutesRouter.get('/leaderboard', validate({ query: LeaderboardQuery }), leaderboard);
brutesRouter.post(
  '/',
  mutationRateLimit,
  requireWallet,
  validate({ body: CreateBruteBody }),
  createBrute,
);
brutesRouter.get('/:id', validate({ params: BruteIdParams }), getBrute);
brutesRouter.get('/:id/pupils', validate({ params: BruteIdParams }), getPupils);
brutesRouter.put('/:id/pets', mutationRateLimit, requireWallet, validate({ params: BruteIdParams, body: SetPetsBody }), setPets);
