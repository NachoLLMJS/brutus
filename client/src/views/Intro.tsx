import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Intro() {
  const [showLogo, setShowLogo] = useState(false);
  const navigate = useNavigate();

  const updateLogoCue = (video: HTMLVideoElement) => {
    const duration = Number.isFinite(video.duration) ? video.duration : 10;
    setShowLogo(video.currentTime >= Math.max(0, duration - 3));
  };

  const enterGame = () => {
    navigate('/home#forge');
    window.setTimeout(() => {
      document.getElementById('forge')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <main className="intro-page" aria-label="Vault Brawl intro cinematic">
      <video
        className="intro-page-video"
        src="/videos/vault-brawl-intro.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => updateLogoCue(event.currentTarget)}
        onTimeUpdate={(event) => updateLogoCue(event.currentTarget)}
      />
      <div className="intro-page-vignette" aria-hidden />
      {showLogo && (
        <button className="intro-page-logo" type="button" onClick={enterGame} aria-label="Enter Vault Brawl">
          <img src="/logos/vaultbrawl-retro-parchment-banner.png" alt="Vault Brawl" draggable={false} />
        </button>
      )}
      <button className="intro-page-skip" type="button" onClick={enterGame}>
        Skip cinematic
      </button>
    </main>
  );
}
