import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Intro() {
  const [showPlay, setShowPlay] = useState(false);
  const navigate = useNavigate();

  const updatePlayCue = (video: HTMLVideoElement) => {
    const duration = Number.isFinite(video.duration) ? video.duration : 10;
    setShowPlay(video.currentTime >= Math.max(0, duration - 3));
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
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => updatePlayCue(event.currentTarget)}
        onTimeUpdate={(event) => updatePlayCue(event.currentTarget)}
        onEnded={() => setShowPlay(true)}
      />
      <div className="intro-page-vignette" aria-hidden />
      {showPlay && (
        <button className="intro-page-play" type="button" onClick={enterGame}>
          Play
        </button>
      )}
      <div className="intro-page-footer-logos" aria-label="Supported ecosystem logos">
        <img src="/images/intro/vault-logo.png" alt="Vault Brawl" />
        <img src="/images/intro/bnb-logo.png" alt="BNB" />
        <img src="/images/intro/metamask-logo.png" alt="MetaMask" />
      </div>
      <button className="intro-page-skip" type="button" onClick={enterGame}>
        Skip cinematic
      </button>
    </main>
  );
}
