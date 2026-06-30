import { create } from 'zustand';
import {
  formatWallet,
  getEthereumProvider,
  isMetaMaskProvider,
  isSupportedBnbChain,
  switchToBnbTestnet,
} from '@/lib/web3';

interface WalletState {
  address: string | null;
  chainId: string | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  switchToBnb: () => Promise<void>;
}

let manuallyDisconnected = false;

async function readChainId(): Promise<string | null> {
  const provider = getEthereumProvider();
  if (!provider) return null;
  try {
    return await provider.request<string>({ method: 'eth_chainId' });
  } catch {
    return null;
  }
}

async function readAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) return [];
  try {
    return await provider.request<string[]>({ method: 'eth_accounts' });
  } catch {
    return [];
  }
}

export const useWalletStore = create<WalletState>()((set, get) => ({
  address: null,
  chainId: null,
  connected: false,
  connecting: false,
  error: null,

  connect: async () => {
    const provider = getEthereumProvider();
    if (!provider) {
      set({ error: 'MetaMask is not installed.' });
      return;
    }
    if (!isMetaMaskProvider(provider)) {
      set({ error: 'Vault Brawl solo acepta MetaMask como provider.' });
      return;
    }

    set({ connecting: true, error: null });
    try {
      manuallyDisconnected = false;
      const accounts = await provider.request<string[]>({ method: 'eth_requestAccounts' });
      const chainId = await readChainId();
      const address = accounts[0] ?? null;
      set({
        address,
        chainId,
        connected: Boolean(address),
        error: address ? null : 'No account was received.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not connect MetaMask.';
      set({ error: message });
    } finally {
      set({ connecting: false });
    }
  },

  disconnect: async () => {
    manuallyDisconnected = true;
    const provider = getEthereumProvider();
    try {
      await provider?.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Some providers do not support permission revocation. Local session is still cleared.
    }
    set({ address: null, chainId: null, connected: false, connecting: false, error: null });
  },

  refresh: async () => {
    if (manuallyDisconnected) {
      set({ address: null, chainId: null, connected: false });
      return;
    }
    const provider = getEthereumProvider();
    if (!provider || !isMetaMaskProvider(provider)) {
      set({ address: null, chainId: null, connected: false });
      return;
    }
    const [accounts, chainId] = await Promise.all([readAccounts(), readChainId()]);
    const address = accounts[0] ?? null;
    set({ address, chainId, connected: Boolean(address) });
  },

  switchToBnb: async () => {
    const provider = getEthereumProvider();
    if (!provider) {
      set({ error: 'MetaMask is not installed.' });
      return;
    }
    set({ connecting: true, error: null });
    try {
      await switchToBnbTestnet(provider);
      await get().refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not switch to BNB.';
      set({ error: message });
    } finally {
      set({ connecting: false });
    }
  },
}));

export function walletStatusLabel(address: string | null, chainId: string | null): string {
  if (!address) return 'Connect MetaMask';
  if (!isSupportedBnbChain(chainId)) return `${formatWallet(address)} · wrong chain`;
  return `${formatWallet(address)} · BNB`;
}
