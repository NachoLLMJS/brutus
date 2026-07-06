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
    <main className="intro-page intro-page-country" aria-label="Vault Brawl intro countryside parallax">
      <div className="intro-parallax" aria-hidden>
        <div className="intro-parallax-layer layer-sky" />
        <div className="intro-parallax-layer layer-clouds" />
        <div className="intro-parallax-layer layer-mountain-back-2" />
        <div className="intro-parallax-layer layer-mountain-back" />
        <div className="intro-parallax-layer layer-mountain" />
        <div className="intro-parallax-layer layer-village" />
        <div className="intro-parallax-layer layer-river-reflex" />
        <div className="intro-parallax-layer layer-river" />
        <div className="intro-parallax-layer layer-river-front" />
      </div>
      <div className="intro-page-vignette" aria-hidden />
      <div className="intro-page-brand" aria-hidden>
        <img src="/favicon.png" alt="" />
      </div>
      <button className="intro-page-play" type="button" onClick={enterGame}>
        Play
      </button>
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
