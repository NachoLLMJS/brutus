import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { AuthNonceBody, AuthVerifyBody, authNonce, authVerify } from '../controllers/auth.js';
import { mutationRateLimit } from '../middleware/rateLimit.js';

export const authRouter: Router = Router();

authRouter.post('/nonce', mutationRateLimit, validate({ body: AuthNonceBody }), authNonce);
authRouter.post('/verify', mutationRateLimit, validate({ body: AuthVerifyBody }), authVerify);
