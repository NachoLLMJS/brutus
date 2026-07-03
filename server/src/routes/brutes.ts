import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { mutationRateLimit } from '../middleware/rateLimit.js';
import {
  BruteIdParams,
  CreateBruteBody,
  ListBrutesQuery,
  createBrute,
  getBrute,
  getPupils,
  listBrutes,
  setPets,
  SetPetsBody,
} from '../controllers/brutes.js';

export const brutesRouter: Router = Router();

brutesRouter.get('/', validate({ query: ListBrutesQuery }), listBrutes);
brutesRouter.post(
  '/',
  mutationRateLimit,
  validate({ body: CreateBruteBody }),
  createBrute,
);
brutesRouter.get('/:id', validate({ params: BruteIdParams }), getBrute);
brutesRouter.get('/:id/pupils', validate({ params: BruteIdParams }), getPupils);
brutesRouter.put('/:id/pets', mutationRateLimit, validate({ params: BruteIdParams, body: SetPetsBody }), setPets);
