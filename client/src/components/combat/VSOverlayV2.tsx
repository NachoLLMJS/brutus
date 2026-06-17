// VS overlay pre-fight: sparks animados + nombres laterales + calavera SVG
// con glow rojo + "VS" letras gigantes. Auto-fade controlado por animación
// CSS de duración `vsDurationMs`.

interface VSOverlayV2Props {
  visible: boolean;
  leftName: string;
  rightName: string;
  /** Duración de la animación en ms. Default 1900ms. */
  durationMs?: number;
}

export function VSOverlayV2({ visible, leftName, rightName, durationMs = 1900 }: VSOverlayV2Props) {
  if (!visible) return null;
  return (
    <div className="vs-overlay" style={{ ['--vs-duration' as string]: `${durationMs}ms` } as React.CSSProperties}>
      <div className="vs-bg" />
      <div className="vs-spark vs-spark-1" />
      <div className="vs-spark vs-spark-2" />
      <div className="vs-name vs-name-l">{leftName}</div>
      <div className="vs-glyph">
        <svg viewBox="0 0 240 240" width="100%" height="100%" aria-hidden>
          <defs>
            <radialGradient id="vs-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#c41a1a" stopOpacity="0.8" />
              <stop offset="1" stopColor="#c41a1a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="120" cy="120" r="110" fill="url(#vs-glow)" />
          <g transform="translate(120 120)">
            <path
              d="M-44 -28 C-44 -54 -22 -68 0 -68 C22 -68 44 -54 44 -28 L44 14 C44 26 38 32 32 36 L32 50 C32 56 28 60 22 60 L14 60 L14 48 L8 48 L8 60 L-8 60 L-8 48 L-14 48 L-14 60 L-22 60 C-28 60 -32 56 -32 50 L-32 36 C-38 32 -44 26 -44 14 Z"
              fill="#1a1014"
              stroke="#e6b450"
              strokeWidth="2"
            />
            <ellipse cx="-18" cy="-12" rx="10" ry="14" fill="#0d0a14" />
            <ellipse cx="18" cy="-12" rx="10" ry="14" fill="#0d0a14" />
            <circle cx="-18" cy="-12" r="3" fill="#c41a1a" />
            <circle cx="18" cy="-12" r="3" fill="#c41a1a" />
            <path d="M-6 8 L0 18 L6 8" fill="#0d0a14" stroke="#e6b450" strokeWidth="1.2" />
            <line x1="-22" y1="36" x2="-22" y2="48" stroke="#e6b450" strokeWidth="1" />
            <line x1="-14" y1="36" x2="-14" y2="48" stroke="#e6b450" strokeWidth="1" />
            <line x1="-6" y1="36" x2="-6" y2="48" stroke="#e6b450" strokeWidth="1" />
            <line x1="6" y1="36" x2="6" y2="48" stroke="#e6b450" strokeWidth="1" />
            <line x1="14" y1="36" x2="14" y2="48" stroke="#e6b450" strokeWidth="1" />
            <line x1="22" y1="36" x2="22" y2="48" stroke="#e6b450" strokeWidth="1" />
          </g>
        </svg>
      </div>
      <div className="vs-letters">VS</div>
      <div className="vs-name vs-name-r">{rightName}</div>
    </div>
  );
}
