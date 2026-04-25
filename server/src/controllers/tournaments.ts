import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as TournamentService from '../services/TournamentService.js';

const ID_REGEX = /^[a-z0-9]{20,40}$/;

export const TournamentIdParams = z.object({
  id: z.string().regex(ID_REGEX, 'invalid_id'),
});

export const runTournament: RequestHandler = async (req, res, next) => {
  try {
    const params = req.params as unknown as z.infer<typeof TournamentIdParams>;
    const result = await TournamentService.runTournament(params.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
