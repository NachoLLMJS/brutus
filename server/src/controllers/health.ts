import type { RequestHandler } from 'express';
import { env } from '../env.js';

const VERSION = '0.3.0';

export const healthCheck: RequestHandler = (_req, res) => {
  res.json({
    ok: true,
    version: VERSION,
    chainId: '0x61',
    combatRewards: env.BRUTUS_COMBAT_REWARDS,
  });
};
