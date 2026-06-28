import { createHash } from 'node:crypto';
import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';
import { env } from '../env.js';
import { HttpError } from '../middleware/errorHandler.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const combatRewardsAbi = parseAbi([
  'function operator() view returns (address)',
  'function fightWinner(bytes32 fightId) view returns (address)',
  'function recordCombatWin(bytes32 fightId, address winner) external',
]);

export function combatRewardFightId(combatId: string): string {
  return `0x${createHash('sha256').update(`brutus-combat:${combatId}`).digest('hex')}`;
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function classifyRecordError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (message.includes('only operator')) return new HttpError(502, 'operator_not_authorized');
  if (message.includes('fight already recorded')) return new HttpError(409, 'fight_already_recorded');
  if (message.includes('insufficient funds') || message.includes('insufficient balance')) return new HttpError(502, 'operator_bnb_missing');
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('rpc')) {
    return new HttpError(502, 'reward_rpc_failed');
  }
  return new HttpError(502, 'record_combat_reward_failed');
}

export async function recordCombatRewardWinner(fightId: string, winnerWallet: string): Promise<string> {
  if (!env.BRUTUS_OPERATOR_PRIVATE_KEY) {
    throw new HttpError(503, 'operator_private_key_missing');
  }

  const account = privateKeyToAccount(env.BRUTUS_OPERATOR_PRIVATE_KEY as Hex);
  const transport = http(env.BNB_TESTNET_RPC_URL);
  const publicClient = createPublicClient({ chain: bscTestnet, transport });
  const walletClient = createWalletClient({ account, chain: bscTestnet, transport });
  const contractAddress = env.BRUTUS_COMBAT_REWARDS as Hex;
  const fightIdHex = fightId as Hex;
  const winnerHex = winnerWallet as Hex;

  try {
    const [code, operator, existingWinner, operatorBalance] = await Promise.all([
      publicClient.getCode({ address: contractAddress }),
      publicClient.readContract({
        address: contractAddress,
        abi: combatRewardsAbi,
        functionName: 'operator',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: combatRewardsAbi,
        functionName: 'fightWinner',
        args: [fightIdHex],
      }),
      publicClient.getBalance({ address: account.address }),
    ]);

    if (!code || code === '0x') {
      throw new HttpError(502, 'reward_contract_missing');
    }
    if (!sameAddress(operator, account.address)) {
      throw new HttpError(502, 'operator_not_authorized');
    }
    if (operatorBalance === 0n) {
      throw new HttpError(502, 'operator_bnb_missing');
    }
    if (!sameAddress(existingWinner, ZERO_ADDRESS)) {
      if (sameAddress(existingWinner, winnerWallet)) {
        return 'already-recorded';
      }
      throw new HttpError(409, 'fight_already_recorded');
    }

    const { request } = await publicClient.simulateContract({
      account,
      address: contractAddress,
      abi: combatRewardsAbi,
      functionName: 'recordCombatWin',
      args: [fightIdHex, winnerHex],
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new HttpError(502, 'record_combat_reward_failed');
    }
    return hash;
  } catch (err) {
    throw classifyRecordError(err);
  }
}
