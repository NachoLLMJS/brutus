import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as FightService from '../services/FightService.js';

const ID_REGEX = /^[a-z0-9]{20,40}$/;

export const FightIdParams = z.object({
  id: z.string().regex(ID_REGEX, 'invalid_id'),
});

export const StartFightBody = z.object({
  fightType: z.enum(['normal', 'training']).default('normal'),
  opponentId: z.string().regex(ID_REGEX, 'invalid_id').optional(),
});

// Mirrors `core.LevelUpChoice` (discriminated union: stat | skill | weapon | pet).
const StatKey = z.enum(['hp', 'strength', 'agility', 'speed']);
const StatChoiceSchema = z.object({
  kind: z.literal('stat'),
  stat: StatKey,
  amount: z.number().int().min(1).max(5),
  secondStat: StatKey.optional(),
  secondAmount: z.number().int().min(1).max(5).optional(),
});
const SkillChoiceSchema = z.object({
  kind: z.literal('skill'),
  skillId: z.string().min(1).max(40),
});
const WeaponChoiceSchema = z.object({
  kind: z.literal('weapon'),
  weaponId: z.string().min(1).max(40),
});
const PetChoiceSchema = z.object({
  kind: z.literal('pet'),
  petId: z.string().min(1).max(40),
});

export const LevelUpBody = z.object({
  choice: z.discriminatedUnion('kind', [
    StatChoiceSchema,
    SkillChoiceSchema,
    WeaponChoiceSchema,
    PetChoiceSchema,
  ]),
});

export const startFight: RequestHandler = async (req, res, next) => {
  try {
    const params = req.params as unknown as z.infer<typeof FightIdParams>;
    const body = req.body as z.infer<typeof StartFightBody>;

    if (!body.opponentId) {
      // Phase 1: client first calls without opponent → server returns
      // 3 candidates the user picks from.
      const opponents = await FightService.suggestOpponents(params.id);
      res.json({ opponents });
      return;
    }

    const result = await FightService.runFight({
      playerId: params.id,
      opponentId: body.opponentId,
      fightType: body.fightType,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const applyLevelUp: RequestHandler = async (req, res, next) => {
  try {
    const params = req.params as unknown as z.infer<typeof FightIdParams>;
    const body = req.body as z.infer<typeof LevelUpBody>;
    const brute = await FightService.applyLevelUp(params.id, body.choice);
    res.json(brute);
  } catch (err) {
    next(err);
  }
};
