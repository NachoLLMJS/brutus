import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from '../env.js';
import { HttpError } from '../middleware/errorHandler.js';

const execFileAsync = promisify(execFile);

export function combatRewardFightId(combatId: string): string {
  return `0x${createHash('sha256').update(`brutus-combat:${combatId}`).digest('hex')}`;
}

export async function recordCombatRewardWinner(fightId: string, winnerWallet: string): Promise<string> {
  if (!env.BRUTUS_OPERATOR_PRIVATE_KEY) {
    throw new HttpError(503, 'operator_private_key_missing');
  }
  const { stdout } = await execFileAsync('cast', [
    'send',
    env.BRUTUS_COMBAT_REWARDS,
    'recordCombatWin(bytes32,address)',
    fightId,
    winnerWallet,
    '--private-key',
    env.BRUTUS_OPERATOR_PRIVATE_KEY,
    '--rpc-url',
    env.BNB_TESTNET_RPC_URL,
    '--json',
  ], { timeout: 120_000, maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout) as { transactionHash?: string; status?: string };
  if (parsed.status !== '0x1' || !parsed.transactionHash) {
    throw new HttpError(502, 'record_combat_reward_failed');
  }
  return parsed.transactionHash;
}
