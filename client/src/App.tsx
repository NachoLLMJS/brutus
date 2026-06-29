import { useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { router } from '@/routes';
import { ToastContainer } from '@/components/Toast';
import { RendererProvider } from '@/hooks/useRenderer';
import { getEthereumProvider } from '@/lib/web3';
import { useGameStore } from '@/store/useGameStore';
import { useWalletStore } from '@/store/useWalletStore';

function WalletBootstrap() {
  const address = useWalletStore((s) => s.address);
  const refresh = useWalletStore((s) => s.refresh);
  const resetSession = useGameStore((s) => s.resetSession);
  const rememberBrute = useGameStore((s) => s.rememberBrute);
  const setCurrentBrute = useGameStore((s) => s.setCurrentBrute);
  const previousAddress = useRef<string | null>(null);

  useEffect(() => {
    localStorage.removeItem('brutus.recent');
    localStorage.removeItem('brutus.wallet');
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
    const normalizedAddress = address?.toLowerCase() ?? null;
    if (previousAddress.current === normalizedAddress) return;
    previousAddress.current = normalizedAddress;
    resetSession();
    if (!normalizedAddress) return;

    let cancelled = false;
    void api.brutes.list(normalizedAddress)
      .then((brutes) => {
        if (cancelled) return;
        brutes.forEach((brute) => rememberBrute({ id: brute.id, name: brute.name, level: brute.level }));
        setCurrentBrute(brutes[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setCurrentBrute(null);
      });
    return () => {
      cancelled = true;
    };
  }, [address, rememberBrute, resetSession, setCurrentBrute]);

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
