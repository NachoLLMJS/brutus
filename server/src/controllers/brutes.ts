import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as BruteService from '../services/BruteService.js';
import { assertBruteOwner } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const NAME_REGEX = /^[a-zA-Z0-9 ]+$/;
const ID_REGEX = /^[a-z0-9]{20,40}$/;
const WALLET_REGEX = /^0x[0-9a-fA-F]{40}$/;
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;

// Keep this schema in the server watch path so client/UI/core/html/skill/weapon/vault-info deploys rebuild reliably.
const LpcAppearanceSchema = z.object({
  head: z.enum(['humanMale', 'humanGaunt', 'humanPlump', 'humanElder']),
  hair: z.enum(['none', 'bedhead', 'bob', 'afro', 'buzzcut', 'long', 'curlyShort', 'bangs']),
  wings: z.enum(['none', 'monarchPurple', 'pixiePurple']).default('monarchPurple'),
  headwear: z.enum([
    'none',
    'armet',
    'barbuta',
    'greathelm',
    'maximus',
    'cedricHelmet',
    'jasonHelmet',
  ]),
  armsArmor: z.enum(['none', 'plate', 'bracers']),
  gloves: z.literal('none').optional(),
  torsoArmor: z.enum(['none', 'trenchCoat', 'plate', 'legion', 'chainmail', 'leather', 'binanceJacket', 'flapMerch', 'collaredCoat']),
  legsArmor: z.enum(['none', 'plate']),
  feetArmor: z.enum(['none', 'plate', 'slippers', 'sandals', 'rimmedBoots']),
  armorColor: z.enum(['steel', 'yellow', 'iron', 'bronze', 'copper', 'pink', 'purple', 'silver', 'black']),
  weapon: z.literal('none'),
});

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
      lpc: LpcAppearanceSchema.optional(),
    })
    .optional(),
  // Renderer Pixi (opcional; si vienen, sobrescriben los random del seed)
  gender: z.enum(['male', 'female']).optional(),
  body: z.string().regex(/^[0-9a-f]{1,11}$/).optional(),
  bodyColors: z.string().regex(/^[0-9a-f]{0,32}$/).optional(),
  walletAddress: z.string().regex(WALLET_REGEX, 'invalid_wallet'),
  onChainBruteId: z.number().int().positive().optional(),
  createTxHash: z.string().regex(TX_HASH_REGEX, 'invalid_create_tx_hash').optional(),
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
  walletAddress: z.string().regex(WALLET_REGEX, 'invalid_wallet').optional(),
});

export const LeaderboardQuery = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : Number.parseInt(v, 10)))
    .pipe(z.number().int().positive().max(100).optional()),
});

export const SetPetsBody = z.object({
  pets: z.array(z.string().min(1).max(40)).max(3),
});

export const createBrute: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof CreateBruteBody>;
    if (!req.wallet) throw new HttpError(401, 'auth_required');
    if (body.walletAddress.toLowerCase() !== req.wallet) throw new HttpError(403, 'wallet_body_mismatch');
    const brute = await BruteService.createBrute(body);
    res.status(201).json(brute);
  } catch (err) {
    next(err);
  }
};

export const listBrutes: RequestHandler = async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof ListBrutesQuery>;
    const list = await BruteService.listBrutes(q.limit, q.walletAddress);
    res.json({ brutes: list });
  } catch (err) {
    next(err);
  }
};

export const leaderboard: RequestHandler = async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof LeaderboardQuery>;
    const entries = await BruteService.listLeaderboard(q.limit ?? 100);
    res.json({ entries });
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

export const setPets: RequestHandler = async (req, res, next) => {
  try {
    const params = req.params as unknown as z.infer<typeof BruteIdParams>;
    const body = req.body as z.infer<typeof SetPetsBody>;
    if (!req.wallet) throw new HttpError(401, 'auth_required');
    await assertBruteOwner(params.id, req.wallet);
    const brute = await BruteService.setBrutePets(params.id, body.pets);
    res.json(brute);
  } catch (err) {
    next(err);
  }
};
