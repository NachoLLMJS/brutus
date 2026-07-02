import { useEffect, useRef, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { router } from '@/routes';
import { ToastContainer } from '@/components/Toast';
import { RendererProvider } from '@/hooks/useRenderer';
import { getMusicStatus, playBgm, setMuted, subscribeMusicStatus } from '@/lib/fight/sounds';
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

function SoundtrackBootstrap() {
  useEffect(() => {
    playBgm('bg');

    const start = () => playBgm('bg');
    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener('pointerdown', start, options);
    window.addEventListener('keydown', start);
    window.addEventListener('touchstart', start, options);
    window.addEventListener('click', start, options);

    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      window.removeEventListener('touchstart', start);
      window.removeEventListener('click', start);
    };
  }, []);

  return null;
}

function TwitterFloatingButton() {
  return (
    <a
      className="twitter-floating-button"
      href="https://x.com/VaultBrawl"
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Open Vault Brawl on X/Twitter"
      title="Vault Brawl on X"
    >
      <span className="twitter-floating-button__icon" aria-hidden>X</span>
      <span className="twitter-floating-button__text">Twitter</span>
    </a>
  );
}

function MusicMuteButton() {
  const [musicStatus, setMusicStatus] = useState(() => getMusicStatus());

  useEffect(() => subscribeMusicStatus(setMusicStatus), []);

  const musicIsPlaying = musicStatus === 'playing';
  const buttonText = musicIsPlaying ? 'Music Playing' : musicStatus === 'muted' ? 'Music Off' : 'Start Music';
  const buttonTitle = musicIsPlaying ? 'Mute music' : 'Start music';
  const buttonIcon = musicIsPlaying ? '♫' : '♪';

  const handleClick = () => {
    if (musicIsPlaying) {
      setMuted(true);
      return;
    }
    setMuted(false);
    playBgm('bg');
  };

  return (
    <button
      type="button"
      className="music-floating-button"
      aria-label={buttonTitle}
      aria-pressed={musicIsPlaying}
      title={buttonTitle}
      onClick={handleClick}
    >
      <span className="twitter-floating-button__icon" aria-hidden>{buttonIcon}</span>
      <span className="twitter-floating-button__text">{buttonText}</span>
    </button>
  );
}

export function App() {
  return (
    <RendererProvider>
      <WalletBootstrap />
      <SoundtrackBootstrap />
      <RouterProvider router={router} />
      <MusicMuteButton />
      <TwitterFloatingButton />
      <ToastContainer />
    </RendererProvider>
  );
}

// Note: el MyBruteHeader se monta dentro de cada vista que lo necesita,
// no globalmente, porque Landing y FightViewer pueden querer headers
// distintos. Profile, Arena y otros lo importan explícitamente.
