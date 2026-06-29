import { useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { router } from '@/routes';
import { ToastContainer } from '@/components/Toast';
import { RendererProvider } from '@/hooks/useRenderer';
import { getEthereumProvider } from '@/lib/web3';
import { useGameStore } from '@/store/useGameStore';
import { useWalletStore } from '@/store/useWalletStore';

function clearLegacySessionStorage() {
  try {
    window.localStorage.removeItem('brutus.wallet');
    window.localStorage.removeItem('brutus.recent');
  } catch {
    // Storage may be unavailable in private/locked contexts.
  }
}

function WalletBootstrap() {
  const address = useWalletStore((s) => s.address);
  const refresh = useWalletStore((s) => s.refresh);
  const replaceBrutes = useGameStore((s) => s.replaceBrutes);
  const resetSession = useGameStore((s) => s.resetSession);
  const previousAddress = useRef<string | null>(null);

  useEffect(() => {
    clearLegacySessionStorage();
    void refresh();
    const provider = getEthereumProvider();
    if (!provider?.on || !provider.removeListener) return;

    const onAccountsChanged = () => void refresh();
    const onChainChanged = () => void refresh();
    provider.on('accountsChanged', onAccountsChanged);
    provider.on('chainChanged', onChainChanged);
    return () => {
      provider.removeListener?.('accountsChanged', onAccountsChanged);
      provider.removeListener?.('chainChanged', onChainChanged);
    };
  }, [refresh]);

  useEffect(() => {
    const wallet = address?.toLowerCase() ?? null;
    if (previousAddress.current === wallet) return;
    previousAddress.current = wallet;
    resetSession();
    if (!wallet) return;

    let cancelled = false;
    void api.brutes.list(wallet)
      .then((brutes) => {
        if (cancelled) return;
        replaceBrutes(brutes.map((brute) => ({ id: brute.id, name: brute.name, level: brute.level })));
      })
      .catch(() => {
        if (!cancelled) resetSession();
      });

    return () => {
      cancelled = true;
    };
  }, [address, replaceBrutes, resetSession]);

  return null;
}

export function App() {
  return (
    <RendererProvider>
      <WalletBootstrap />
      <RouterProvider router={router} />
      <ToastContainer />
    </RendererProvider>
  );
}

// Note: el MyBruteHeader se monta dentro de cada vista que lo necesita,
// no globalmente, porque Landing y FightViewer pueden querer headers
// distintos. Profile, Arena y otros lo importan explícitamente.
