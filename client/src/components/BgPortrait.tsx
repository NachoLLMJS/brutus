// Background full-bleed para Profile v2: SVG estilizado de un guerrero con
// yelmo cornudo. Atmosférico, no es retrato del bruto real (eso queda
// reservado para BruteAvatar en otros lugares). El glow rojo se puede
// togglear desde el TweaksPanel.

interface BgPortraitProps {
  glowing?: boolean;
}

export function BgPortrait({ glowing = true }: BgPortraitProps) {
  return (
    <div className="bg-portrait" aria-hidden>
      <svg viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bp-bg" cx="50%" cy="38%" r="70%">
            <stop offset="0" stopColor="#3d2530" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#1a1014" stopOpacity="0.85" />
            <stop offset="1" stopColor="#0d0a14" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bp-rim" cx="50%" cy="100%" r="60%">
            <stop offset="0" stopColor="#c41a1a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#c41a1a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bp-armor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3d2530" />
            <stop offset="1" stopColor="#0d0a14" />
          </linearGradient>
        </defs>
        <rect width="800" height="1000" fill="url(#bp-bg)" />
        {glowing && <rect width="800" height="1000" fill="url(#bp-rim)" />}

        {/* Bust grande, centrado */}
        <g transform="translate(400 460) scale(2.3)">
          {/* Pauldrons */}
          <path d="M-110 -20 L-50 -40 L-30 -10 L-30 110 L-120 110 L-128 30 Z"
            fill="url(#bp-armor)" stroke="#8a6038" strokeWidth="1.8" />
          <path d="M110 -20 L50 -40 L30 -10 L30 110 L120 110 L128 30 Z"
            fill="url(#bp-armor)" stroke="#8a6038" strokeWidth="1.8" />
          <path d="M-128 0 L-140 -22 L-120 -8 Z" fill="#1a1014" stroke="#8a6038" strokeWidth="1" />
          <path d="M128 0 L140 -22 L120 -8 Z" fill="#1a1014" stroke="#8a6038" strokeWidth="1" />

          {/* Chest plate */}
          <path d="M-30 -10 L0 -16 L30 -10 L40 110 L-40 110 Z" fill="#1a1014" stroke="#8a6038" strokeWidth="1.4" />
          <line x1="0" y1="-16" x2="0" y2="110" stroke="#3d2530" strokeWidth="2" />
          <circle cx="0" cy="34" r="7" fill="#c41a1a" />
          <circle cx="0" cy="34" r="7" fill="none" stroke="#e6b450" strokeWidth="1.4" />

          {/* Gorget */}
          <rect x="-20" y="-30" width="40" height="20" fill="#0d0a14" stroke="#6a4528" strokeWidth="1" />

          {/* Helm */}
          <path d="M0 -190 L60 -160 L70 -80 L58 -50 L-58 -50 L-70 -80 L-60 -160 Z"
            fill="#1a1014" stroke="#8a6038" strokeWidth="1.8" />
          {/* Horns */}
          <path d="M-60 -160 L-100 -210 L-78 -170 Z" fill="#1a1014" stroke="#8a6038" strokeWidth="1.4" />
          <path d="M60 -160 L100 -210 L78 -170 Z" fill="#1a1014" stroke="#8a6038" strokeWidth="1.4" />
          <path d="M-66 -130 L-104 -156 L-78 -140 Z" fill="#3d2530" stroke="#8a6038" strokeWidth="1" />
          <path d="M66 -130 L104 -156 L78 -140 Z" fill="#3d2530" stroke="#8a6038" strokeWidth="1" />
          <path d="M0 -190 L-4 -220 L0 -240 L4 -220 Z" fill="#3d2530" stroke="#8a6038" strokeWidth="1" />

          {/* Visor T */}
          <rect x="-36" y="-110" width="72" height="6" fill="#050308" />
          <rect x="-4" y="-104" width="8" height="40" fill="#050308" />
          <ellipse cx="-22" cy="-107" rx="6" ry="2" fill="#c41a1a" />
          <ellipse cx="22" cy="-107" rx="6" ry="2" fill="#c41a1a" />
          <circle cx="-22" cy="-107" r="2" fill="#ff5a3c" />
          <circle cx="22" cy="-107" r="2" fill="#ff5a3c" />

          {/* Ridge */}
          <path d="M-40 -130 L0 -138 L40 -130" fill="none" stroke="#e6b450" strokeWidth="1.2" opacity="0.7" />
          <circle cx="0" cy="-134" r="3" fill="#e6b450" opacity="0.85" />
        </g>
      </svg>
    </div>
  );
}
