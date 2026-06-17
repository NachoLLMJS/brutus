// End overlay post-combate: card con verdict (Victoria/Derrota) + nombre del
// ganador + summary + rewards (XP real, Streak determinístico) + acciones.

interface EndOverlayProps {
  visible: boolean;
  isPlayerWinner: boolean;
  winnerName: string;
  playerName: string;
  playerHp: number;
  playerMaxHp: number;
  totalSteps: number;
  /** XP ganado en el combate (real, viene del backend). */
  xpAwarded?: number;
  /** Racha de victorias (determinístico). */
  streak: number;
  onRetry: () => void;
  onProfile: () => void;
  /** Si hay levelup pendiente, redirige al level-up en lugar de profile. */
  hasLevelUp?: boolean;
  onLevelUp?: () => void;
}

export function EndOverlay({
  visible,
  isPlayerWinner,
  winnerName,
  playerName,
  playerHp,
  playerMaxHp,
  totalSteps,
  xpAwarded,
  streak,
  onRetry,
  onProfile,
  hasLevelUp,
  onLevelUp,
}: EndOverlayProps) {
  if (!visible) return null;
  const verdict = isPlayerWinner ? 'Victoria' : 'Derrota';
  return (
    <div className="end-overlay">
      <div className="end-card">
        <div className="verdict">{verdict}</div>
        <h1>{winnerName}</h1>
        <p className="summary">
          <b>{playerName}</b> termina con <b>{Math.max(0, playerHp)}/{playerMaxHp}</b> HP.
          Combate decidido en <b>{totalSteps}</b> turnos.
        </p>
        <div className="end-rewards">
          {typeof xpAwarded === 'number' && (
            <div className="end-reward">
              <span className="lbl">XP</span>
              <span className="val">+{xpAwarded}</span>
            </div>
          )}
          <div className="end-reward">
            <span className="lbl">Racha</span>
            <span className="val">×{streak}</span>
          </div>
        </div>
        <div className="end-actions">
          <button type="button" className="cb-btn" onClick={onRetry}>
            ↺ Volver
          </button>
          {hasLevelUp && onLevelUp ? (
            <button type="button" className="cb-btn gold" onClick={onLevelUp}>
              ★ Elegir mejora
            </button>
          ) : (
            <button type="button" className="cb-btn gold" onClick={onProfile}>
              Al templo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
