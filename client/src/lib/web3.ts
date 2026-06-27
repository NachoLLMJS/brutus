export interface EthereumProvider {
  isMetaMask?: boolean;
  request: <T = unknown>(args: { method: string; params?: unknown[] | object }) => Promise<T>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

export const BNB_MAINNET = {
  chainId: '0x38',
  chainName: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com'],
} as const;

export const BNB_TESTNET = {
  chainId: '0x61',
  chainName: 'BNB Smart Chain Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com'],
} as const;

export const SUPPORTED_BNB_CHAINS = [BNB_MAINNET.chainId, BNB_TESTNET.chainId] as const;

export const BRUTUS_BNB_TESTNET_CONTRACTS = {
  chainId: BNB_TESTNET.chainId,
  token: '0x473159256928B25f6B0E7cd75d49EbD4ac977777',
  vault: '0x4e7a2406a623dB7DdB0a93748732Bb7D95390A02',
  rewardPool: '0x5debF8Ad01AB37726bE848Ada5D76EFFae87fd8C',
  registry: '0x4D842e6843B74c5366188225E12B0E9742725C78',
  dailyActions: '0xecF5EA60D706c7D96Bbf1aaE19be8B40E149eB49',
  combatRewards: '0x22703D0153133450067C2A310D07d44f1Af7584a',
  arenaEscrow: '0x2415248C3adAEc3484E041A741C1BFE1AA9bBC14',
  vaultFactory: '0x6A0C133eDA27204349CE924ac6FE6B3B4AdBA083',
} as const;

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  return window.ethereum ?? null;
}

export function isMetaMaskProvider(provider: EthereumProvider | null): provider is EthereumProvider {
  return Boolean(provider?.isMetaMask);
}

export function isSupportedBnbChain(chainId: string | null): boolean {
  if (!chainId) return false;
  return SUPPORTED_BNB_CHAINS.includes(chainId.toLowerCase() as (typeof SUPPORTED_BNB_CHAINS)[number]);
}

export function formatWallet(address: string | null): string {
  if (!address) return 'Sin wallet';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export async function switchToBnbTestnet(provider: EthereumProvider): Promise<void> {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BNB_TESTNET.chainId }],
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? Number((error as { code: unknown }).code)
      : 0;
    if (code !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [BNB_TESTNET],
    });
  }
}

const CREATE_EXTRA_BRUTE_SELECTOR = '0x9b517ea1';
const CLAIM_COMBAT_REWARD_SELECTOR = '0xcfe0a961';
const MINIMUM_TOKEN_HOLD_SELECTOR = '0xc07e579e';
const CLAIM_AMOUNT_WEI_SELECTOR = '0x30bbab15';
const GAME_TOKEN_SELECTOR = '0xc3dfdae6';
const ERC20_BALANCE_OF_SELECTOR = '0x70a08231';
const EXTRA_BRUTE_PRICE_SELECTOR = '0x2cab4165';
const NEXT_BRUTE_ID_SELECTOR = '0x0b4dd2a0';
const BRUTE_CREATED_TOPIC = '0xfbe356727e47cbbe402da96eaae9ef22f838ecffbd2203e8119a4c42cb408e7b';

interface TransactionReceiptLog {
  address: string;
  topics: string[];
  data: string;
}

interface TransactionReceipt {
  transactionHash: string;
  status: string;
  logs: TransactionReceiptLog[];
}

function strip0x(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value;
}

function pad64(hex: string): string {
  return strip0x(hex).padStart(64, '0');
}

function encodeAddress(address: string): string {
  return pad64(address.toLowerCase());
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex && hex !== '0x' ? hex : '0x0');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function metadataHashForBrute(input: {
  name: string;
  walletAddress: string;
  gender: string;
  body: string;
  bodyColors: string;
}): Promise<string> {
  const payload = JSON.stringify(input);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return `0x${bytesToHex(new Uint8Array(digest))}`;
}

export async function readExtraBrutePrice(provider: EthereumProvider, walletAddress: string): Promise<bigint> {
  const data = `${EXTRA_BRUTE_PRICE_SELECTOR}${encodeAddress(walletAddress)}`;
  const result = await provider.request<string>({
    method: 'eth_call',
    params: [{ to: BRUTUS_BNB_TESTNET_CONTRACTS.registry, data }, 'latest'],
  });
  return hexToBigInt(result);
}

export async function readNextOnChainBruteId(provider: EthereumProvider): Promise<number> {
  const result = await provider.request<string>({
    method: 'eth_call',
    params: [{ to: BRUTUS_BNB_TESTNET_CONTRACTS.registry, data: NEXT_BRUTE_ID_SELECTOR }, 'latest'],
  });
  return Number(hexToBigInt(result));
}

async function waitForReceipt(provider: EthereumProvider, txHash: string): Promise<TransactionReceipt> {
  for (let i = 0; i < 60; i += 1) {
    const receipt = await provider.request<TransactionReceipt | null>({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    });
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error('tx_receipt_timeout');
}

function parseBruteIdFromReceipt(receipt: TransactionReceipt): number | null {
  const registry = BRUTUS_BNB_TESTNET_CONTRACTS.registry.toLowerCase();
  for (const log of receipt.logs ?? []) {
    if (log.address.toLowerCase() !== registry) continue;
    if ((log.topics?.[0] ?? '').toLowerCase() !== BRUTE_CREATED_TOPIC) continue;
    const bruteIdTopic = log.topics?.[2];
    if (!bruteIdTopic) continue;
    return Number(hexToBigInt(bruteIdTopic));
  }
  return null;
}

export async function createPaidExtraBruteOnChain(
  provider: EthereumProvider,
  walletAddress: string,
  metadataHash: string,
): Promise<{ txHash: string; onChainBruteId: number }> {
  const [price, predictedId] = await Promise.all([
    readExtraBrutePrice(provider, walletAddress),
    readNextOnChainBruteId(provider),
  ]);
  const txHash = await provider.request<string>({
    method: 'eth_sendTransaction',
    params: [{
      from: walletAddress,
      to: BRUTUS_BNB_TESTNET_CONTRACTS.registry,
      value: `0x${price.toString(16)}`,
      data: `${CREATE_EXTRA_BRUTE_SELECTOR}${pad64(metadataHash)}`,
    }],
  });
  const receipt = await waitForReceipt(provider, txHash);
  if (receipt.status !== '0x1') throw new Error('tx_failed');
  return { txHash, onChainBruteId: parseBruteIdFromReceipt(receipt) ?? predictedId };
}

export async function readCombatClaimRequirements(
  provider: EthereumProvider,
  walletAddress: string,
): Promise<{
  token: string;
  minimumHold: bigint;
  walletBalance: bigint;
  claimAmount: bigint;
  canHoldClaim: boolean;
}> {
  const [tokenResult, minimumHoldResult, claimAmountResult] = await Promise.all([
    provider.request<string>({
      method: 'eth_call',
      params: [{ to: BRUTUS_BNB_TESTNET_CONTRACTS.combatRewards, data: GAME_TOKEN_SELECTOR }, 'latest'],
    }),
    provider.request<string>({
      method: 'eth_call',
      params: [{ to: BRUTUS_BNB_TESTNET_CONTRACTS.combatRewards, data: MINIMUM_TOKEN_HOLD_SELECTOR }, 'latest'],
    }),
    provider.request<string>({
      method: 'eth_call',
      params: [{ to: BRUTUS_BNB_TESTNET_CONTRACTS.combatRewards, data: CLAIM_AMOUNT_WEI_SELECTOR }, 'latest'],
    }),
  ]);
  const token = `0x${strip0x(tokenResult).slice(24, 64)}`;
  const minimumHold = hexToBigInt(minimumHoldResult);
  const claimAmount = hexToBigInt(claimAmountResult);
  const walletBalanceResult = await provider.request<string>({
    method: 'eth_call',
    params: [{ to: token, data: `${ERC20_BALANCE_OF_SELECTOR}${encodeAddress(walletAddress)}` }, 'latest'],
  });
  const walletBalance = hexToBigInt(walletBalanceResult);
  return {
    token,
    minimumHold,
    walletBalance,
    claimAmount,
    canHoldClaim: walletBalance >= minimumHold,
  };
}

export function formatTokenUnits(raw: bigint, decimals = 18): string {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  const fractionText = fraction.toString().padStart(decimals, '0').slice(0, 2).replace(/0+$/, '');
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

export async function claimCombatRewardOnChain(
  provider: EthereumProvider,
  walletAddress: string,
  fightId: string,
): Promise<{ txHash: string }> {
  const txHash = await provider.request<string>({
    method: 'eth_sendTransaction',
    params: [{
      from: walletAddress,
      to: BRUTUS_BNB_TESTNET_CONTRACTS.combatRewards,
      data: `${CLAIM_COMBAT_REWARD_SELECTOR}${pad64(fightId)}`,
    }],
  });
  const receipt = await waitForReceipt(provider, txHash);
  if (receipt.status !== '0x1') throw new Error('tx_failed');
  return { txHash };
}

export function formatBnbWei(wei: bigint): string {
  const whole = wei / 1_000_000_000_000_000_000n;
  const fraction = wei % 1_000_000_000_000_000_000n;
  const fractionText = fraction.toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '');
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}
