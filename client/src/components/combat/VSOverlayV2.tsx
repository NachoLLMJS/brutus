// VS overlay pre-fight: background art + nombres laterales + favicon/logo
// central con glow + "VS" letras gigantes. Auto-fade controlado por animación
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
      <div className="vs-glyph" aria-hidden>
        <img className="vs-logo" src="/favicon.png" alt="" />
      </div>
      <div className="vs-letters">VS</div>
      <div className="vs-name vs-name-r">{rightName}</div>
    </div>
  );
}
