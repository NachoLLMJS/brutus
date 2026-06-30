// End overlay post-combate: card con verdict (Victory/Defeat) + nombre del
// ganador + summary + rewards (XP real, Streak determinístico) + acciones.

import type { ReactNode } from 'react';

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
  /** Streak de victorias (determinístico). */
  streak: number;
  onProfile: () => void;
  /** Si hay levelup pendiente, redirige to level-up en lugar de profile. */
  hasLevelUp?: boolean;
  onLevelUp?: () => void;
  claimRewardButton?: ReactNode;
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
  onProfile,
  hasLevelUp,
  onLevelUp,
  claimRewardButton,
}: EndOverlayProps) {
  if (!visible) return null;
  const verdict = isPlayerWinner ? 'Victory' : 'Defeat';
  return (
    <div className="end-overlay">
      <div className="end-card">
        <div className="verdict">{verdict}</div>
        <h1>{winnerName}</h1>
        <p className="summary">
          <b>{playerName}</b> ends with <b>{Math.max(0, playerHp)}/{playerMaxHp}</b> HP.
          Fight decided in <b>{totalSteps}</b> turns.
        </p>
        <div className="end-rewards">
          {typeof xpAwarded === 'number' && (
            <div className="end-reward">
              <span className="lbl">XP</span>
              <span className="val">+{xpAwarded}</span>
            </div>
          )}
          <div className="end-reward">
            <span className="lbl">Streak</span>
            <span className="val">×{streak}</span>
          </div>
        </div>
        {claimRewardButton}
        <div className="end-actions">
          {hasLevelUp && onLevelUp ? (
            <button type="button" className="cb-btn gold" onClick={onLevelUp}>
              ★ Choose upgrade
            </button>
          ) : (
            <button type="button" className="cb-btn gold" onClick={onProfile}>
              To temple →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
