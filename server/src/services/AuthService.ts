import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { verifyMessage } from 'viem';
import { env } from '../env.js';
import { HttpError } from '../middleware/errorHandler.js';

const WALLET_REGEX = /^0x[0-9a-fA-F]{40}$/;
const NONCE_TTL_MS = 15 * 60 * 1000;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface NonceRecord {
  wallet: string;
  message: string;
  expiresAt: number;
}

interface TokenPayload {
  wallet: string;
  exp: number;
}

const nonces = new Map<string, NonceRecord>();

function normalizeWallet(wallet: string): string {
  if (!WALLET_REGEX.test(wallet)) throw new HttpError(400, 'invalid_wallet');
  return wallet.toLowerCase();
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function pruneExpiredNonces(): void {
  const now = Date.now();
  for (const [nonce, record] of nonces) {
    if (record.expiresAt <= now) nonces.delete(nonce);
  }
}

export function createLoginChallenge(walletInput: string): { wallet: string; nonce: string; message: string; expiresAt: string } {
  pruneExpiredNonces();
  const wallet = normalizeWallet(walletInput);
  const nonce = randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  const expiresAtMs = Date.now() + NONCE_TTL_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const message = [
    'Vault Brawl login',
    '',
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expires At: ${expiresAt}`,
    '',
    'Sign this message to prove wallet ownership. This does not cost gas.',
  ].join('\n');

  nonces.set(nonce, { wallet, message, expiresAt: expiresAtMs });
  return { wallet, nonce, message, expiresAt };
}

export async function verifyLoginChallenge(input: {
  wallet: string;
  nonce: string;
  signature: string;
}): Promise<{ wallet: string; token: string; expiresAt: string }> {
  const wallet = normalizeWallet(input.wallet);
  const record = nonces.get(input.nonce);
  if (!record) throw new HttpError(401, 'auth_nonce_not_found');
  nonces.delete(input.nonce);
  if (record.expiresAt <= Date.now()) throw new HttpError(401, 'auth_nonce_expired');
  if (record.wallet !== wallet) throw new HttpError(401, 'auth_wallet_mismatch');

  const ok = await verifyMessage({
    address: wallet as `0x${string}`,
    message: record.message,
    signature: input.signature as `0x${string}`,
  });
  if (!ok) throw new HttpError(401, 'auth_signature_invalid');

  const exp = Date.now() + TOKEN_TTL_MS;
  const token = issueToken({ wallet, exp });
  return { wallet, token, expiresAt: new Date(exp).toISOString() };
}

export function issueToken(payload: TokenPayload): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  return `${data}.${sign(data)}`;
}

export function verifyToken(token: string): TokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'auth_token_invalid');
  const [header, body, signature] = parts as [string, string, string];
  const expected = sign(`${header}.${body}`);
  if (!safeEqual(signature, expected)) throw new HttpError(401, 'auth_token_invalid');

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
  } catch {
    throw new HttpError(401, 'auth_token_invalid');
  }
  if (!payload.wallet || typeof payload.exp !== 'number') throw new HttpError(401, 'auth_token_invalid');
  const wallet = normalizeWallet(payload.wallet);
  if (payload.exp <= Date.now()) throw new HttpError(401, 'auth_token_expired');
  return { wallet, exp: payload.exp };
}
