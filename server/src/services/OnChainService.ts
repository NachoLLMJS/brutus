import { createHash } from 'node:crypto';
import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';
import { env } from '../env.js';
import { HttpError } from '../middleware/errorHandler.js';

const combatRewardsAbi = parseAbi([
  'function recordCombatWin(bytes32 fightId, address winner) external',
]);

export function combatRewardFightId(combatId: string): string {
  return `0x${createHash('sha256').update(`brutus-combat:${combatId}`).digest('hex')}`;
}

export async function recordCombatRewardWinner(fightId: string, winnerWallet: string): Promise<string> {
  if (!env.BRUTUS_OPERATOR_PRIVATE_KEY) {
    throw new HttpError(503, 'operator_private_key_missing');
  }

  try {
    const account = privateKeyToAccount(env.BRUTUS_OPERATOR_PRIVATE_KEY as Hex);
    const transport = http(env.BNB_TESTNET_RPC_URL);
    const publicClient = createPublicClient({ chain: bscTestnet, transport });
    const walletClient = createWalletClient({ account, chain: bscTestnet, transport });

    const hash = await walletClient.writeContract({
      address: env.BRUTUS_COMBAT_REWARDS as Hex,
      abi: combatRewardsAbi,
      functionName: 'recordCombatWin',
      args: [fightId as Hex, winnerWallet as Hex],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new HttpError(502, 'record_combat_reward_failed');
    }
    return hash;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, 'record_combat_reward_failed');
  }
}
