import { useEffect, useRef, useState } from 'react';
import { RouterProvider } from 'react-router-dom';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (
          options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
          element: string,
        ) => unknown;
      };
    };
  }
}

const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';
const GOOGLE_TRANSLATE_COOKIE = 'googtrans';
const CHINESE_TRANSLATE_COOKIE_VALUE = '/en/zh-CN';

function setTranslateCookie(value: string | null) {
  const expires = value ? 'max-age=31536000' : 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const cookieValue = value ?? '';
  const host = window.location.hostname;
  const domains = ['', host, `.${host}`];

  for (const domain of domains) {
    const domainPart = domain ? ` domain=${domain};` : '';
    document.cookie = `${GOOGLE_TRANSLATE_COOKIE}=${cookieValue}; path=/;${domainPart} ${expires}; SameSite=Lax`;
  }
}

function waitForTranslateSelect(): Promise<HTMLSelectElement> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
      if (select) {
        window.clearInterval(timer);
        resolve(select);
        return;
      }
      if (Date.now() - startedAt > 8000) {
        window.clearInterval(timer);
        reject(new Error('Google Translate widget did not load'));
      }
    }, 100);
  });
}

function loadGoogleTranslateWidget(): Promise<void> {
  if (window.google?.translate?.TranslateElement) return Promise.resolve();

  return new Promise((resolve, reject) => {
    window.googleTranslateElementInit = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      if (!TranslateElement) {
        reject(new Error('Google Translate widget is unavailable'));
        return;
      }
      new TranslateElement(
        { pageLanguage: 'en', includedLanguages: 'zh-CN', autoDisplay: false },
        'google_translate_element',
      );
      resolve();
    };

    const existingScript = document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) return;

    const script = document.createElement('script');
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = () => reject(new Error('Could not load Google Translate'));
    document.head.appendChild(script);
  });
}

async function setPageLanguage(language: 'original' | 'zh-CN') {
  if (language === 'original') {
    setTranslateCookie(null);
    window.location.reload();
    return;
  }

  setTranslateCookie(CHINESE_TRANSLATE_COOKIE_VALUE);
  await loadGoogleTranslateWidget();
  const select = await waitForTranslateSelect();
  select.value = 'zh-CN';
  select.dispatchEvent(new Event('change', { bubbles: true }));

  window.setTimeout(() => {
    const htmlLang = document.documentElement.lang.toLowerCase();
    const translatedFrame = document.querySelector('iframe.goog-te-banner-frame, iframe.skiptranslate');
    const translatedBody = document.body.className.includes('translated') || htmlLang.includes('zh');
    if (!translatedFrame && !translatedBody) {
      window.location.reload();
    }
  }, 1200);
}
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

function LanguageTranslateButton() {
  const [isChinese, setIsChinese] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.cookie.includes(`${GOOGLE_TRANSLATE_COOKIE}=${CHINESE_TRANSLATE_COOKIE_VALUE}`);
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isChinese) return;
    void setPageLanguage('zh-CN').catch((error) => {
      console.error(error);
      setTranslateCookie(null);
      setIsChinese(false);
    });
  }, [isChinese]);

  const buttonText = isLoading ? 'Translating' : isChinese ? 'Original' : '中文';
  const buttonTitle = isChinese ? 'Show original English site' : 'Translate site to Chinese';

  const handleClick = async () => {
    const nextIsChinese = !isChinese;
    setIsLoading(true);
    try {
      await setPageLanguage(nextIsChinese ? 'zh-CN' : 'original');
      setIsChinese(nextIsChinese);
    } catch (error) {
      console.error(error);
      setTranslateCookie(null);
      setIsChinese(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div id="google_translate_element" aria-hidden="true" />
      <button
        type="button"
        className="translate-floating-button"
        aria-label={buttonTitle}
        aria-pressed={isChinese}
        title={buttonTitle}
        onClick={handleClick}
        disabled={isLoading}
      >
        <span className="twitter-floating-button__icon" aria-hidden>文</span>
        <span className="twitter-floating-button__text">{buttonText}</span>
      </button>
    </>
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
      <LanguageTranslateButton />
      <MusicMuteButton />
      <TwitterFloatingButton />
      <ToastContainer />
    </RendererProvider>
  );
}

// Note: el MyBruteHeader se monta dentro de cada vista que lo necesita,
// no globalmente, porque Landing y FightViewer pueden querer headers
// distintos. Profile, Arena y otros lo importan explícitamente.
