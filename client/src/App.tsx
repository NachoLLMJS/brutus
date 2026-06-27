import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { ToastContainer } from '@/components/Toast';
import { RendererProvider } from '@/hooks/useRenderer';
import { getEthereumProvider } from '@/lib/web3';
import { useWalletStore } from '@/store/useWalletStore';

function WalletBootstrap() {
  const refresh = useWalletStore((s) => s.refresh);

  useEffect(() => {
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
