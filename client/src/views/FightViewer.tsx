// FightViewer · Combate.
// Visual treatment del bundle Claude Design (combat-stage fullscreen, top
// FighterCards, canvas frame con corners ornamentales, log live aside,
// turn pips, action banners DOM, VS overlay dramático, end overlay).
// Lógica preservada: Pixi FightStage mount, fightLog steps, HP state via
// onHpChange, skip handler, navigation post-combate.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepType, type FightLog, type FightStep } from 'core';
import type { Brute } from 'core';
import { useToastStore } from '@/store/useToastStore';
import { useGameStore } from '@/store/useGameStore';
import { FightStage } from '@/lib/fight/Stage';
import { FighterCard } from '@/components/combat/FighterCard';
import { CombatLog } from '@/components/combat/CombatLog';
import { TurnPips } from '@/components/combat/TurnPips';
import { ActionBanner } from '@/components/combat/ActionBanner';
import { VSOverlayV2 } from '@/components/combat/VSOverlayV2';
import { EndOverlay } from '@/components/combat/EndOverlay';
import { TweaksPanel, TweakSection, TweakToggle, TweakSlider } from '@/components/TweaksPanel';
import { useCombatSettings } from '@/store/useCombatSettings';
import { useBrute } from '@/hooks/useBrute';
import { api } from '@/api/apiClient';
import { useWalletStore } from '@/store/useWalletStore';
import {
  claimCombatRewardOnChain,
  formatBnbWei,
  formatTokenUnits,
  getEthereumProvider,
  isSupportedBnbChain,
  readCombatCanClaim,
  readCombatClaimRequirements,
} from '@/lib/web3';

const VS_DURATION_MS = 1900;

export function FightViewer() {
  const { id = '' } = useParams<{ id: string; fid: string }>();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);
  const lastFight = useGameStore((s) => s.lastFight);
  const { brute: playerBrute } = useBrute(id);
  const walletAddress = useWalletStore((s) => s.address);
  const chainId = useWalletStore((s) => s.chainId);
  const connectWallet = useWalletStore((s) => s.connect);
  const switchToBnb = useWalletStore((s) => s.switchToBnb);
  const walletReady = Boolean(walletAddress && isSupportedBnbChain(chainId));

  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageInstance = useRef<FightStage | null>(null);

  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [phase, setPhase] = useState<'versus' | 'fighting'>('versus');
  const [hpById, setHpById] = useState<Record<number, number>>({});
  const [bannerKey, setBannerKey] = useState<{ text: string; epoch: number } | null>(null);
  const [opponentBrute, setOpponentBrute] = useState<Brute | null>(null);
  const [claimingReward, setClaimingReward] = useState(false);
  const [claimedRewardTx, setClaimedRewardTx] = useState<string | null>(null);
  const [claimInfo, setClaimInfo] = useState<{
    minimumHold: bigint;
    walletBalance: bigint;
    claimAmount: bigint;
    canHoldClaim: boolean;
  } | null>(null);
  const [claimInfoLoading, setClaimInfoLoading] = useState(false);

  const showActionBanner = useCombatSettings((s) => s.showActionBanner);
  const setShowActionBanner = useCombatSettings((s) => s.setShowActionBanner);
  const logLength = useCombatSettings((s) => s.logLength);
  const setLogLength = useCombatSettings((s) => s.setLogLength);

  const fightLog: FightLog | undefined = lastFight?.combat.fightLog;
  const opponentBruteId = lastFight?.combat.opponent?.id;

  // Auto-arrancar el combate después del VS overlay.
  useEffect(() => {
    if (!fightLog) return;
    const t = window.setTimeout(() => setPhase('fighting'), VS_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [fightLog]);

  // Inicializar HP full al cargar el log.
  useEffect(() => {
    if (!fightLog) return;
    const initial: Record<number, number> = {};
    for (const f of fightLog.fighters) initial[f.id] = f.maxHp;
    setHpById(initial);
  }, [fightLog]);

  // Fetch opponent brute para metadata (level, rank, weapons, skills).
  useEffect(() => {
    if (!opponentBruteId) return;
    let cancelled = false;
    void (async () => {
      try {
        const b = await api.brutes.get(opponentBruteId);
        if (!cancelled) setOpponentBrute(b);
      } catch {
        // metadata es secundaria; si falla, FighterCard usa fallbacks
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opponentBruteId]);

  // Mount Pixi stage cuando entramos en fase 'fighting'.
  useEffect(() => {
    if (phase !== 'fighting' || !fightLog || !stageRef.current) return;
    const stage = new FightStage({
      view: stageRef.current,
      log: fightLog,
      speed: 0.7, // 70% — más lento que default, decisión del usuario
      onProgress: (i, t) => setProgress({ done: i + 1, total: t }),
      onComplete: (w) => setWinnerId(w),
      onHpChange: (fid, hp) => {
        setHpById((prev) => ({ ...prev, [fid]: hp }));
      },
    });
    stageInstance.current = stage;
    void stage.play();
    return () => {
      stage.destroy();
      stageInstance.current = null;
    };
  }, [phase, fightLog]);

  useEffect(() => {
    const reward = lastFight?.combat.reward;
    if (!reward?.eligible || !walletReady || !walletAddress) {
      setClaimInfo(null);
      return;
    }
    const provider = getEthereumProvider();
    if (!provider) return;
    let cancelled = false;
    setClaimInfoLoading(true);
    void readCombatClaimRequirements(provider, walletAddress)
      .then((info) => {
        if (!cancelled) setClaimInfo(info);
      })
      .catch(() => {
        if (!cancelled) setClaimInfo(null);
      })
      .finally(() => {
        if (!cancelled) setClaimInfoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lastFight?.combat.reward?.eligible, walletAddress, walletReady]);

  // Detectar steps recientes para disparar action banners DOM.
  useEffect(() => {
    if (!fightLog || !showActionBanner) return;
    if (progress.done <= 0) return;
    const lastStep = fightLog.steps[progress.done - 1];
    if (!lastStep) return;
    const banner = stepToBanner(lastStep);
    if (banner) {
      setBannerKey({ text: banner, epoch: progress.done });
      const t = window.setTimeout(() => setBannerKey(null), 1200);
      return () => window.clearTimeout(t);
    }
  }, [progress.done, fightLog, showActionBanner]);

  const skip = () => stageInstance.current?.skip();

  const exit = () => {
    navigate(`/brute/${id}`);
  };
  const goLevelUp = () => {
    navigate(`/brute/${id}/levelup`);
  };

  const claimReward = async () => {
    const reward = lastFight?.combat.reward;
    if (!reward?.eligible || !reward.fightId) return;
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    if (!walletReady) {
      await switchToBnb();
      return;
    }
    const provider = getEthereumProvider();
    if (!provider) {
      pushToast('error', 'MetaMask no está disponible.');
      return;
    }
    setClaimingReward(true);
    try {
      const info = claimInfo ?? await readCombatClaimRequirements(provider, walletAddress);
      setClaimInfo(info);
      if (!info.canHoldClaim) {
        pushToast(
          'error',
          `No puedes claimear todavía: necesitas holdear ${formatTokenUnits(info.minimumHold)} tokens y ahora tienes ${formatTokenUnits(info.walletBalance)}.`,
        );
        return;
      }
      const canClaim = await readCombatCanClaim(provider, walletAddress, reward.fightId);
      if (!canClaim.ok) {
        const reason = canClaim.reason || 'claim_not_available';
        const readable = reason === 'needs 10000 tokens'
          ? `No puedes claimear todavía: necesitas holdear ${formatTokenUnits(info.minimumHold)} tokens y ahora tienes ${formatTokenUnits(info.walletBalance)}.`
          : `No puedes claimear todavía: ${reason}.`;
        pushToast('error', readable);
        return;
      }
      const tx = await claimCombatRewardOnChain(provider, walletAddress, reward.fightId);
      setClaimedRewardTx(tx.txHash);
      pushToast('success', `Claim enviado: ${formatBnbWei(info.claimAmount)} BNB testnet.`);
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'claim_failed';
      const msg = raw.toLowerCase().includes('minimum token hold')
        ? 'No puedes claimear todavía: necesitas holdear 10,000 tokens para cobrar la victoria.'
        : raw;
      pushToast('error', `No se pudo claimear: ${msg}`);
    } finally {
      setClaimingReward(false);
    }
  };

  // Streak determinístico: simple wins-losses del player brute, sign con clamp.
  const streak = useMemo(() => {
    if (!playerBrute) return 0;
    const diff = playerBrute.victories - playerBrute.defeats;
    return Math.max(-12, Math.min(12, diff));
  }, [playerBrute]);

  if (!lastFight) {
    return (
      <div className="combat-stage">
        <div className="m-auto text-blood font-display text-xl uppercase tracking-widest p-6">
          No hay combate activo.
          <button className="cb-btn ml-3" onClick={() => navigate(`/brute/${id}`)}>
            Volver al perfil
          </button>
        </div>
      </div>
    );
  }
  if (!fightLog) {
    return (
      <div className="combat-stage">
        <div className="m-auto text-muted font-display p-6 uppercase tracking-widest">
          Convocando el combate…
        </div>
      </div>
    );
  }

  const [aFighter, bFighter] = fightLog.fighters;
  if (!aFighter || !bFighter) {
    return null;
  }

  // Initial weapons del log (ArriveStep.w).
  const initialWeaponA = findInitialWeapon(fightLog, aFighter.id);
  const initialWeaponB = findInitialWeapon(fightLog, bFighter.id);

  // Player es siempre side 'A' (id matches aFighter), opponent side 'B'.
  // Determinar quién fue el winner.
  const winnerName = winnerId
    ? fightLog.fighters.find((f) => f.id === winnerId)?.name ?? '—'
    : '—';
  const isPlayerWinner = winnerId === aFighter.id;
  const playerHp = hpById[aFighter.id] ?? aFighter.maxHp;

  return (
    <>
      <div className="combat-stage">
        {/* TOP — fighter cards + streak */}
        <header className="combat-top">
          <FighterCard
            fighter={aFighter}
            hp={hpById[aFighter.id] ?? aFighter.maxHp}
            side="left"
            level={playerBrute?.level}
            rank={playerBrute?.rank}
            weaponId={initialWeaponA}
            skills={playerBrute?.skills ?? []}
          />
          <div className="combat-top-center">
            <div className="streak-badge">
              <span className="label">Racha</span>
              <span className="num">×{Math.abs(streak)}</span>
              <span className="sub">{streak >= 0 ? 'Victorias' : 'Derrotas'}</span>
            </div>
          </div>
          <FighterCard
            fighter={bFighter}
            hp={hpById[bFighter.id] ?? bFighter.maxHp}
            side="right"
            level={opponentBrute?.level}
            rank={opponentBrute?.rank}
            weaponId={initialWeaponB}
            skills={opponentBrute?.skills ?? []}
          />
        </header>

        {/* ARENA */}
        <main className="combat-arena">
          <div className="canvas-wrap">
            <div className="canvas-frame">
              <div className="corner tl"><CornerSVG /></div>
              <div className="corner tr"><CornerSVG /></div>
              <div className="corner bl"><CornerSVG /></div>
              <div className="corner br"><CornerSVG /></div>

              {/* Pixi mount */}
              <div ref={stageRef} className="canvas-pixi-mount" />

              {/* DOM action banner aditivo */}
              {showActionBanner && bannerKey && <ActionBanner text={bannerKey.text} />}
            </div>

            <div className="turn-strip">
              <span className="ts-label">Turno</span>
              <TurnPips total={progress.total || fightLog.steps.length} current={progress.done} />
              <span className="ts-num">
                {Math.min(progress.done, progress.total || fightLog.steps.length)}/
                {progress.total || fightLog.steps.length}
              </span>
            </div>
          </div>

          <CombatLog log={fightLog} currentIdx={progress.done} logLength={logLength} />
        </main>

        {/* BOTTOM — controls */}
        <footer className="combat-bottom">
          <div className="cb-side">
            <button type="button" className="cb-btn" onClick={exit}>
              ← Salir
            </button>
            <button
              type="button"
              className="cb-btn danger"
              onClick={skip}
              disabled={winnerId !== null}
            >
              Saltar ▶▶
            </button>
          </div>
          <div className="cb-center" />
          <div className="cb-side right">
            <div className="cb-rewards">
              <span className="label">En juego</span>
              <span className="val">+XP por victoria</span>
            </div>
          </div>
        </footer>
      </div>

      <VSOverlayV2
        visible={phase === 'versus'}
        leftName={aFighter.name}
        rightName={bFighter.name}
        durationMs={VS_DURATION_MS}
      />

      {winnerId !== null && (
        <EndOverlay
          visible
          isPlayerWinner={isPlayerWinner}
          winnerName={winnerName}
          playerName={aFighter.name}
          playerHp={playerHp}
          playerMaxHp={aFighter.maxHp}
          totalSteps={progress.done}
          streak={Math.abs(streak)}
          xpAwarded={undefined /* server no expone xpAwarded en FightResponse aún */}
          hasLevelUp={lastFight.leveledUp}
          onProfile={() => {
            navigate(`/brute/${id}`);
            pushToast('info', isPlayerWinner ? 'Victoria.' : 'Derrota.');
          }}
          onLevelUp={goLevelUp}
          claimRewardButton={isPlayerWinner ? (
            <div style={{ display: 'grid', gap: 8, margin: '14px 0', justifyItems: 'center' }}>
              {lastFight.combat.reward?.eligible ? (
                <>
                  <button
                    type="button"
                    className="cb-btn gold"
                    onClick={() => void claimReward()}
                    disabled={claimingReward || Boolean(claimedRewardTx) || Boolean(claimInfo && !claimInfo.canHoldClaim)}
                  >
                    {claimedRewardTx
                      ? `✓ ${claimInfo ? formatBnbWei(claimInfo.claimAmount) : '0.001'} BNB claimeado`
                      : claimingReward
                        ? 'Claimeando…'
                        : claimInfo
                          ? `Claim ${formatBnbWei(claimInfo.claimAmount)} BNB testnet`
                          : 'Claim BNB testnet'}
                  </button>
                  {claimInfoLoading && !claimInfo && !claimedRewardTx && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      Comprobando hold on-chain…
                    </span>
                  )}
                  {claimInfo && !claimInfo.canHoldClaim && !claimedRewardTx && (
                    <span style={{ color: 'var(--primary)', fontSize: 12, maxWidth: 360, textAlign: 'center' }}>
                      No puedes claimear todavía: necesitas holdear {formatTokenUnits(claimInfo.minimumHold)} tokens.
                      Ahora tienes {formatTokenUnits(claimInfo.walletBalance)}.
                    </span>
                  )}
                  {claimInfo?.canHoldClaim && !claimedRewardTx && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      Hold verificado on-chain: puedes cobrar.
                    </span>
                  )}
                  {!walletReady && !claimedRewardTx && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      Conecta MetaMask en BNB Testnet para cobrar desde el vault.
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: 'var(--primary)', fontSize: 12, maxWidth: 380, textAlign: 'center' }}>
                  Claim no disponible: {rewardReasonLabel(lastFight.combat.reward?.reason)}
                </span>
              )}
            </div>
          ) : undefined}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Efectos">
          <TweakToggle
            label="Banner de acción (CRIT/BLOQUEO/ESQUIVA)"
            value={showActionBanner}
            onChange={setShowActionBanner}
          />
        </TweakSection>
        <TweakSection title="Bitácora">
          <TweakSlider
            label="Largo del log"
            min={5}
            max={30}
            step={1}
            value={logLength}
            onChange={setLogLength}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

/* ─── Helpers ─── */

function findInitialWeapon(log: FightLog, fighterId: number): string | null {
  for (const step of log.steps) {
    if (step.a === StepType.Arrive && step.f === fighterId) {
      return step.w ?? null;
    }
  }
  return null;
}

function rewardReasonLabel(reason?: string): string {
  switch (reason) {
    case 'operator_private_key_missing':
      return 'falta configurar BRUTUS_OPERATOR_PRIVATE_KEY en Railway.';
    case 'record_combat_reward_failed':
      return 'el contrato no pudo registrar esta victoria.';
    case 'reward_contract_missing':
      return 'la dirección del contrato de rewards no tiene contrato desplegado en BNB Testnet.';
    case 'operator_not_authorized':
      return 'la wallet operadora del servidor no es el operator del contrato de rewards.';
    case 'operator_bnb_missing':
      return 'la wallet operadora del servidor no tiene BNB testnet para pagar gas.';
    case 'reward_rpc_failed':
      return 'falló el RPC de BNB Testnet al registrar la victoria.';
    case 'fight_already_recorded':
      return 'esta pelea ya estaba registrada on-chain.';
    case 'winner_wallet_missing':
      return 'este bruto no tiene wallet owner asociada.';
    case 'training_fight_no_bnb_reward':
      return 'las peleas de entrenamiento no tienen reward BNB.';
    case 'player_lost':
      return 'solo se puede claimear si ganas.';
    case 'recording_unavailable':
      return 'registro on-chain no disponible.';
    default:
      return reason || 'registro on-chain no disponible.';
  }
}

function stepToBanner(step: FightStep): string | null {
  switch (step.a) {
    case StepType.Hit:
      return step.c === 1 ? '¡CRÍTICO!' : null;
    case StepType.Block:
      return '¡BLOQUEO!';
    case StepType.Evade:
      return '¡ESQUIVA!';
    default:
      return null;
  }
}

function CornerSVG() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden>
      <path d="M0 0 L36 0 L36 4 L8 4 Q4 4 4 8 L4 36 L0 36 Z" fill="#e6b450" />
      <path d="M4 4 L36 4 L36 8 L8 8 L8 36 L4 36 Z" fill="#3d2530" />
      <circle cx="6" cy="6" r="1.5" fill="#0d0a14" />
    </svg>
  );
}
