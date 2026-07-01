import { useNavigate } from 'react-router-dom';

export function Intro() {
  const navigate = useNavigate();

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
      />
      <div className="intro-page-vignette" aria-hidden />
      <button className="intro-page-skip" type="button" onClick={enterGame}>
        Skip cinematic
      </button>
    </main>
  );
}
