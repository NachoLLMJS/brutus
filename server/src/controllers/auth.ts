import type { RequestHandler } from 'express';
import { z } from 'zod';
import { createLoginChallenge, verifyLoginChallenge } from '../services/AuthService.js';

const WALLET_REGEX = /^0x[0-9a-fA-F]{40}$/;
const SIG_REGEX = /^0x[0-9a-fA-F]+$/;

export const AuthNonceBody = z.object({
  wallet: z.string().regex(WALLET_REGEX, 'invalid_wallet'),
});

export const AuthVerifyBody = z.object({
  wallet: z.string().regex(WALLET_REGEX, 'invalid_wallet'),
  nonce: z.string().min(16).max(80),
  signature: z.string().regex(SIG_REGEX, 'invalid_signature'),
});

export const authNonce: RequestHandler = (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof AuthNonceBody>;
    res.json(createLoginChallenge(body.wallet));
  } catch (err) {
    next(err);
  }
};

export const authVerify: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof AuthVerifyBody>;
    res.json(await verifyLoginChallenge(body));
  } catch (err) {
    next(err);
  }
};
