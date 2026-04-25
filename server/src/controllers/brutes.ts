import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as BruteService from '../services/BruteService.js';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const NAME_REGEX = /^[a-zA-Z0-9 ]+$/;
const ID_REGEX = /^[a-z0-9]{20,40}$/;

export const CreateBruteBody = z.object({
  name: z.string().min(3).max(20).regex(NAME_REGEX, 'name_format'),
  masterId: z.string().regex(ID_REGEX, 'invalid_id').optional(),
  appearance: z
    .object({
      gender: z.enum(['M', 'F']),
      skin: z.string().regex(HEX_COLOR),
      hair: z.string().regex(HEX_COLOR),
      shirt: z.string().regex(HEX_COLOR),
      pants: z.string().regex(HEX_COLOR),
    })
    .optional(),
});

export const BruteIdParams = z.object({
  id: z.string().regex(ID_REGEX, 'invalid_id'),
});

export const ListBrutesQuery = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : Number.parseInt(v, 10)))
    .pipe(z.number().int().positive().max(100).optional()),
});

export const createBrute: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof CreateBruteBody>;
    const brute = await BruteService.createBrute(body);
    res.status(201).json(brute);
  } catch (err) {
    next(err);
  }
};

export const listBrutes: RequestHandler = async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof ListBrutesQuery>;
    const list = await BruteService.listBrutes(q.limit);
    res.json({ brutes: list });
  } catch (err) {
    next(err);
  }
};

export const getBrute: RequestHandler = async (req, res, next) => {
  try {
    const params = req.params as unknown as z.infer<typeof BruteIdParams>;
    const brute = await BruteService.getBruteById(params.id);
    const pupils = await BruteService.listPupils(params.id);
    res.json({ ...brute, pupils });
  } catch (err) {
    next(err);
  }
};

export const getPupils: RequestHandler = async (req, res, next) => {
  try {
    const params = req.params as unknown as z.infer<typeof BruteIdParams>;
    const pupils = await BruteService.listPupils(params.id);
    res.json({ pupils });
  } catch (err) {
    next(err);
  }
};
