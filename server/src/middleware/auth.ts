import type { RequestHandler } from 'express';
import { verifyToken } from '../services/AuthService.js';
import { HttpError } from './errorHandler.js';
import { prisma } from '../db.js';

declare global {
  namespace Express {
    interface Request {
      wallet?: string;
    }
  }
}

export const requireWallet: RequestHandler = (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'auth_required');
    const token = header.slice('Bearer '.length).trim();
    req.wallet = verifyToken(token).wallet;
    next();
  } catch (err) {
    next(err);
  }
};

export async function assertBruteOwner(bruteId: string, wallet: string): Promise<void> {
  const brute = await prisma.brute.findUnique({ where: { id: bruteId }, select: { ownerWallet: true } });
  if (!brute) throw new HttpError(404, 'brute_not_found');
  if (!brute.ownerWallet || brute.ownerWallet.toLowerCase() !== wallet.toLowerCase()) {
    throw new HttpError(403, 'brute_not_owned_by_wallet');
  }
}
