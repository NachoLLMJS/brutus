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

export const SUPPORTED_BNB_CHAINS = [BNB_TESTNET.chainId] as const;

export const BRUTUS_BNB_TESTNET_CONTRACTS = {
  chainId: BNB_TESTNET.chainId,
  token: '0xe7B0C3574C85C5A8C8Bbbfde299B223F68477777',
  vault: '0xae21b38dD8Ef95aa41824fb840436fc1f049fcFf',
  rewardPool: '0x9b9b801Fef24947D13b850a93B456C03aeed1Aec',
  registry: '0xd74a0941c441Bac2121992f33bd910059300B2C3',
  dailyActions: '0xecF5EA60D706c7D96Bbf1aaE19be8B40E149eB49',
  combatRewards: '0x9b9b801Fef24947D13b850a93B456C03aeed1Aec',
  arenaEscrow: '0x2415248C3adAEc3484E041A741C1BFE1AA9bBC14',
  vaultFactory: '0x1A641ca0aDeEc88817A5D9E0CCeD281d41AdaE49',
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

async function assertBnbTestnet(provider: EthereumProvider): Promise<void> {
  const chainId = await provider.request<string>({ method: 'eth_chainId' });
  if (chainId.toLowerCase() !== BNB_TESTNET.chainId) {
    throw new Error('wrong_chain_switch_to_bnb_testnet');
  }
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
const CAN_CLAIM_SELECTOR = '0xaa9641ab';
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

function hexToUtf8(hex: string): string {
  const clean = strip0x(hex);
  const bytes = clean.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [];
  return new TextDecoder().decode(new Uint8Array(bytes)).replace(/\0+$/g, '');
}

function decodeCanClaim(result: string): { ok: boolean; reason: string } {
  const clean = strip0x(result);
  const ok = hexToBigInt(`0x${clean.slice(0, 64)}`) === 1n;
  const offset = Number(hexToBigInt(`0x${clean.slice(64, 128)}`));
  const lengthStart = offset * 2;
  const reasonLength = Number(hexToBigInt(`0x${clean.slice(lengthStart, lengthStart + 64)}`));
  const reasonStart = lengthStart + 64;
  const reason = reasonLength > 0 ? hexToUtf8(clean.slice(reasonStart, reasonStart + reasonLength * 2)) : '';
  return { ok, reason };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function rightRotate(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256Fallback(bytes: Uint8Array): Uint8Array {
  const k: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const h: number[] = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const setH = (idx: number, value: number) => { h[idx] = value >>> 0; };
  const bitLenHi = Math.floor((bytes.length * 8) / 0x100000000);
  const bitLenLo = (bytes.length * 8) >>> 0;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, bitLenHi);
  view.setUint32(paddedLength - 4, bitLenLo);
  const w = new Array<number>(64).fill(0);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const wm15 = w[i - 15]!;
      const wm2 = w[i - 2]!;
      const s0 = rightRotate(wm15, 7) ^ rightRotate(wm15, 18) ^ (wm15 >>> 3);
      const s1 = rightRotate(wm2, 17) ^ rightRotate(wm2, 19) ^ (wm2 >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    let f = h[5]!;
    let g = h[6]!;
    let hh = h[7]!;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + ch + k[i]! + w[i]!) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    setH(0, h[0]! + a); setH(1, h[1]! + b); setH(2, h[2]! + c); setH(3, h[3]! + d);
    setH(4, h[4]! + e); setH(5, h[5]! + f); setH(6, h[6]! + g); setH(7, h[7]! + hh);
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  h.forEach((value, i) => outView.setUint32(i * 4, value));
  return out;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  if (globalThis.crypto?.subtle?.digest) {
    const copy = new Uint8Array(bytes);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', copy.buffer as ArrayBuffer);
    return new Uint8Array(digest);
  }
  return sha256Fallback(bytes);
}

export async function metadataHashForBrute(input: {
  name: string;
  walletAddress: string;
  gender: string;
  body: string;
  bodyColors: string;
}): Promise<string> {
  const payload = JSON.stringify(input);
  return `0x${bytesToHex(await sha256(new TextEncoder().encode(payload)))}`;
}

export async function readExtraBrutePrice(provider: EthereumProvider, walletAddress: string): Promise<bigint> {
  await assertBnbTestnet(provider);
  const data = `${EXTRA_BRUTE_PRICE_SELECTOR}${encodeAddress(walletAddress)}`;
  const result = await provider.request<string>({
    method: 'eth_call',
    params: [{ to: BRUTUS_BNB_TESTNET_CONTRACTS.registry, data }, 'latest'],
  });
  return hexToBigInt(result);
}

export async function readNextOnChainBruteId(provider: EthereumProvider): Promise<number> {
  await assertBnbTestnet(provider);
  const result = await provider.request<string>({
    method: 'eth_call',
    params: [{ to: BRUTUS_BNB_TESTNET_CONTRACTS.registry, data: NEXT_BRUTE_ID_SELECTOR }, 'latest'],
  });
  const nextId = Number(hexToBigInt(result));
  if (!Number.isSafeInteger(nextId) || nextId <= 0) throw new Error('invalid_onchain_brute_id');
  return nextId;
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
  if (price <= 0n) throw new Error('invalid_extra_brute_price');
  if (!Number.isSafeInteger(predictedId) || predictedId <= 0) throw new Error('invalid_onchain_brute_id');
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
  await assertBnbTestnet(provider);
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

export async function readCombatCanClaim(
  provider: EthereumProvider,
  walletAddress: string,
  fightId: string,
): Promise<{ ok: boolean; reason: string }> {
  await assertBnbTestnet(provider);
  const data = `${CAN_CLAIM_SELECTOR}${pad64(fightId)}${encodeAddress(walletAddress)}`;
  const result = await provider.request<string>({
    method: 'eth_call',
    params: [{ to: BRUTUS_BNB_TESTNET_CONTRACTS.combatRewards, data }, 'latest'],
  });
  return decodeCanClaim(result);
}

export async function claimCombatRewardOnChain(
  provider: EthereumProvider,
  walletAddress: string,
  fightId: string,
): Promise<{ txHash: string }> {
  await assertBnbTestnet(provider);
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
