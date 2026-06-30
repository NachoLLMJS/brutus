import { useEffect, useState } from 'react';

/**
 * Header decorativo estilo MyBrute: logo grande "BRUTUS" sobre piedras, con
 * dos personajes laterales y un reloj abajo. 957px max-width centrado.
 *
 * Los assets vienen de LaBrute (header/background.png, header/left.png,
 * header/right.png) y isn copiados a /images/ui/header/.
 */
export function MyBruteHeader() {
  const [time, setTime] = useState<string>(() => formatTime(new Date()));

  useEffect(() => {
    const interval = window.setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Filtro temporal: los assets PNG de header son cream/cartoon (LaBrute).
  // Aplicamos brightness/sepia/hue-rotate para que combinen con el fondo
  // dark fantasy hasta que generemos assets nativos de la temática.
  const darkFantasyFilter =
    'brightness(0.62) contrast(1.15) sepia(0.45) hue-rotate(-12deg) saturate(1.55)';

  return (
    <header className="w-full pt-2 pb-3 select-none">
      <div className="relative mx-auto" style={{ maxWidth: 957, height: 152 }}>
        {/* Sprite izquierdo (oculto en mobile) */}
        <img
          src="/images/ui/header/left.png"
          alt=""
          aria-hidden
          className="hidden md:block absolute left-0 top-0"
          style={{ height: 152, pointerEvents: 'none', filter: darkFantasyFilter }}
        />
        {/* Sprite derecho */}
        <img
          src="/images/ui/header/right.png"
          alt=""
          aria-hidden
          className="hidden md:block absolute right-0 top-0"
          style={{ height: 152, pointerEvents: 'none', filter: darkFantasyFilter }}
        />

        {/* Background con logo MY BRUTE — escalado para encajar */}
        <div
          className="mx-auto"
          style={{
            backgroundImage: 'url(/images/ui/header/background.png)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top',
            backgroundSize: 'contain',
            width: '100%',
            maxWidth: 700,
            height: 132,
            filter: darkFantasyFilter,
          }}
        />

        {/* Subtítulo + reloj */}
        <div className="text-center mt-1" style={{ fontFamily: 'var(--font-display)' }}>
          <div
            className="text-ink-strong tracking-widest text-xs sm:text-sm"
            style={{ letterSpacing: '0.18em' }}
          >
            VAULT BRAWL · CREA TU BRAWLER
          </div>
          <div className="text-ink mt-0.5 text-xs flex items-center justify-center gap-1">
            <span aria-hidden>⌛</span>
            <time dateTime={time}>{time}</time>
          </div>
        </div>
      </div>
    </header>
  );
}

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
