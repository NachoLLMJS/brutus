import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as TournamentService from '../services/TournamentService.js';
import { assertBruteOwner } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

const ID_REGEX = /^[a-z0-9]{20,40}$/;

export const TournamentIdParams = z.object({
  id: z.string().regex(ID_REGEX, 'invalid_id'),
});

export const runTournament: RequestHandler = async (req, res, next) => {
  try {
    const params = req.params as unknown as z.infer<typeof TournamentIdParams>;
    if (!req.wallet) throw new HttpError(401, 'auth_required');
    await assertBruteOwner(params.id, req.wallet);
    const result = await TournamentService.runTournament(params.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
