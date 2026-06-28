import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  disconnect: () => void;
  refresh: () => Promise<void>;
  switchToBnb: () => Promise<void>;
}

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

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      chainId: null,
      connected: false,
      connecting: false,
      error: null,

      connect: async () => {
        const provider = getEthereumProvider();
        if (!provider) {
          set({ error: 'MetaMask no está instalado.' });
          return;
        }
        if (!isMetaMaskProvider(provider)) {
          set({ error: 'AFKFLAP solo acepta MetaMask como provider.' });
          return;
        }

        set({ connecting: true, error: null });
        try {
          const accounts = await provider.request<string[]>({ method: 'eth_requestAccounts' });
          const chainId = await readChainId();
          const address = accounts[0] ?? null;
          set({
            address,
            chainId,
            connected: Boolean(address),
            error: address ? null : 'No se recibió ninguna cuenta.',
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo conectar MetaMask.';
          set({ error: message });
        } finally {
          set({ connecting: false });
        }
      },

      disconnect: () => set({ address: null, chainId: null, connected: false, error: null }),

      refresh: async () => {
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
          set({ error: 'MetaMask no está instalado.' });
          return;
        }
        set({ connecting: true, error: null });
        try {
          await switchToBnbTestnet(provider);
          await get().refresh();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo cambiar a BNB.';
          set({ error: message });
        } finally {
          set({ connecting: false });
        }
      },
    }),
    {
      name: 'brutus.wallet',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ address: s.address, chainId: s.chainId, connected: s.connected }),
    },
  ),
);

export function walletStatusLabel(address: string | null, chainId: string | null): string {
  if (!address) return 'Conectar MetaMask';
  if (!isSupportedBnbChain(chainId)) return `${formatWallet(address)} · wrong chain`;
  return `${formatWallet(address)} · BNB`;
}
