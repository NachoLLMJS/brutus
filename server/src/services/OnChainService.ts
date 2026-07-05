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

const registryAbi = parseAbi([
  'function ownerOfBrute(uint256 bruteId) view returns (address)',
  'function metadataHashOf(uint256 bruteId) view returns (bytes32)',
]);

const petRegistryAbi = parseAbi([
  'function ownsPet(address owner, bytes32 petId) view returns (bool)',
]);

const BRUTE_CREATED_TOPIC = '0xfbe356727e47cbbe402da96eaae9ef22f838ecffbd2203e8119a4c42cb408e7b';
const CREATE_EXTRA_BRUTE_SELECTOR = '0x9b517ea1';
const CREATE_EXTRA_BRUTE_WITH_TOKEN_SELECTOR = '0xcc276cff';

export function combatRewardFightId(combatId: string): string {
  return `0x${createHash('sha256').update(`brutus-combat:${combatId}`).digest('hex')}`;
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function pad64(hex: string): string {
  return hex.replace(/^0x/i, '').padStart(64, '0');
}

function bytes32String(value: string): Hex {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > 32) throw new HttpError(400, 'pet_id_too_long');
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0')}` as Hex;
}

function addressFromTopic(topic?: string): string | null {
  if (!topic || topic.length < 42) return null;
  return `0x${topic.slice(-40)}`;
}

function bruteIdFromTopic(topic?: string): number | null {
  if (!topic) return null;
  const value = Number(BigInt(topic as Hex));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function publicClient() {
  return createPublicClient({ chain: bscTestnet, transport: http(env.BNB_TESTNET_RPC_URL) });
}

export async function verifyExtraBrutePayment(input: {
  wallet: string;
  txHash: string;
  onChainBruteId: number;
  metadataHash: string;
}): Promise<void> {
  const client = publicClient();
  const registry = env.BRUTUS_REGISTRY as Hex;
  const txHash = input.txHash as Hex;
  const metadataHash = input.metadataHash.toLowerCase() as Hex;

  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash: txHash }),
    client.getTransactionReceipt({ hash: txHash }),
  ]);

  if (receipt.status !== 'success') throw new HttpError(402, 'extra_brute_tx_failed');
  if (!tx.to || !sameAddress(tx.to, registry)) throw new HttpError(400, 'extra_brute_tx_wrong_contract');
  if (!sameAddress(tx.from, input.wallet)) throw new HttpError(403, 'extra_brute_tx_wrong_sender');

  const data = tx.input.toLowerCase();
  const selector = data.slice(0, 10);
  const isBnbExtra = selector === CREATE_EXTRA_BRUTE_SELECTOR;
  const isTokenExtra = selector === CREATE_EXTRA_BRUTE_WITH_TOKEN_SELECTOR;
  if (!isBnbExtra && !isTokenExtra) throw new HttpError(400, 'extra_brute_tx_wrong_method');
  if (!data.endsWith(pad64(metadataHash))) throw new HttpError(400, 'extra_brute_metadata_mismatch');
  if (isBnbExtra && tx.value <= 0n) throw new HttpError(400, 'extra_brute_bnb_payment_missing');

  const createdLog = receipt.logs.find((log) => {
    if (!sameAddress(log.address, registry)) return false;
    if ((log.topics[0] ?? '').toLowerCase() !== BRUTE_CREATED_TOPIC) return false;
    const owner = addressFromTopic(log.topics[1]);
    const bruteId = bruteIdFromTopic(log.topics[2]);
    return Boolean(owner && sameAddress(owner, input.wallet) && bruteId === input.onChainBruteId);
  });
  if (!createdLog) throw new HttpError(400, 'extra_brute_event_not_found');
  if (!createdLog.data.toLowerCase().startsWith(metadataHash)) {
    throw new HttpError(400, 'extra_brute_event_metadata_mismatch');
  }

  const [ownerOfBrute, storedMetadata] = await Promise.all([
    client.readContract({ address: registry, abi: registryAbi, functionName: 'ownerOfBrute', args: [BigInt(input.onChainBruteId)] }),
    client.readContract({ address: registry, abi: registryAbi, functionName: 'metadataHashOf', args: [BigInt(input.onChainBruteId)] }),
  ]);
  if (!sameAddress(ownerOfBrute, input.wallet)) throw new HttpError(403, 'extra_brute_onchain_owner_mismatch');
  if (storedMetadata.toLowerCase() !== metadataHash) throw new HttpError(400, 'extra_brute_onchain_metadata_mismatch');
}

export async function verifyWalletOwnsPets(wallet: string, petIds: string[]): Promise<void> {
  if (petIds.length === 0) return;
  const client = publicClient();
  const petRegistry = env.BRUTUS_PET_REGISTRY as Hex;
  const code = await client.getCode({ address: petRegistry });
  if (!code || code === '0x') throw new HttpError(502, 'pet_registry_missing');

  const unique = Array.from(new Set(petIds));
  const entries = await Promise.all(unique.map(async (petId) => {
    const owned = await client.readContract({
      address: petRegistry,
      abi: petRegistryAbi,
      functionName: 'ownsPet',
      args: [wallet as Hex, bytes32String(petId)],
    });
    return [petId, owned] as const;
  }));
  const missing = entries.filter(([, owned]) => !owned).map(([petId]) => petId);
  if (missing.length > 0) throw new HttpError(403, 'pet_not_owned_onchain');
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
      console.warn('combat_reward_operator_mismatch', {
        rewardsContract: contractAddress,
        contractOperator: operator,
        serverOperator: account.address,
      });
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
