import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { mutationRateLimit } from '../middleware/rateLimit.js';
import { TournamentIdParams, runTournament } from '../controllers/tournaments.js';

export const tournamentsRouter: Router = Router();

tournamentsRouter.post(
  '/:id/tournaments',
  mutationRateLimit,
  validate({ params: TournamentIdParams }),
  runTournament,
);
