// Arena = Tablón de la Fosa.
// Lobby de selección de oponente con la dirección visual dark fantasy
// generada por Claude Design.
//
// Arquitectura:
// - Datos: api.brutes.opponents() (real)
// - Flavor (rumor, streak, lastFight, status, glyphs): generado
//   determinísticamente desde brute.id en `lib/lobbyFlavor.ts`
// - Settings (training, defaultFilter, showSidebar): sesión en memoria via `useLobbySettings`
// - Avatares: BruteAvatar real (sprites Pixi del juego)

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { api, ApiError } from '@/api/apiClient';
import { useBrute } from '@/hooks/useBrute';
import { BruteAvatar } from '@/components/BruteAvatar';
import { useToastStore } from '@/store/useToastStore';
import { useGameStore } from '@/store/useGameStore';
import { useLobbySettings, type LobbyFilter } from '@/store/useLobbySettings';
import { flavorFor, type WeaponIcon, type BeastIcon, type FlavorStatus } from '@/lib/lobbyFlavor';
import type { Brute } from 'core';

const FILTERS: { id: LobbyFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'near', label: 'Tu nivel' },
  { id: 'easy', label: 'Más débiles' },
  { id: 'tough', label: 'Más fuertes' },
  { id: 'online', label: 'En la fosa' },
];

export function Arena() {
  const { id = '' } = useParams<{ id: string }>();
  const { brute } = useBrute(id);
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);

  // Settings de sesión (training, filter, sidebar).
  const trainingMode = useLobbySettings((s) => s.trainingMode);
  const setTrainingMode = useLobbySettings((s) => s.setTrainingMode);
  const defaultFilter = useLobbySettings((s) => s.defaultFilter);
  const showSidebar = useLobbySettings((s) => s.showSidebar);

  // Estado local: filtro activo, oponentes cargados, toast.
  const [filter, setFilter] = useState<LobbyFilter>(defaultFilter);
  const [opponents, setOpponents] = useState<Brute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);

  const setLastFight = useGameStore((s) => s.setLastFight);
  const setPendingLevelUp = useGameStore((s) => s.setPendingLevelUp);

  // Cargar oponentes según trainingMode.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const list = await api.brutes.opponents(id, trainingMode);
        if (!cancelled) setOpponents(list);
      } catch (e) {
        const code = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
        pushToast('error', `No se pudieron cargar oponentes: ${code}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, trainingMode, refreshNonce, pushToast]);

  // Filtrar por nivel/online relativo al bruto actual.
  const myLevel = brute?.level ?? 1;
  const filtered = useMemo(() => {
    return opponents.filter((op) => {
      const f = flavorFor(op);
      if (filter === 'near') return Math.abs(op.level - myLevel) <= 2;
      if (filter === 'easy') return op.level < myLevel;
      if (filter === 'tough') return op.level > myLevel;
      if (filter === 'online') return f.status === 'online';
      return true;
    });
  }, [opponents, filter, myLevel]);

  const showToast = (msg: string) => {
    setLocalToast(msg);
    window.setTimeout(() => setLocalToast(null), 2200);
  };

  const challenge = async (op: Brute) => {
    if (submittingId) return;
    setSubmittingId(op.id);
    try {
      const res = await api.brutes.fight(id, { opponentId: op.id, training: trainingMode });
      setLastFight(res);
      if (res.leveledUp && res.levelUpChoices) {
        setPendingLevelUp({ bruteId: id, offer: res.levelUpChoices });
      }
      showToast(trainingMode ? `Sparring contra ${op.name}` : `Desafío enviado · ${op.name}`);
      window.setTimeout(() => navigate(`/brute/${id}/fight/${res.combat.id}`), 500);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
      pushToast('error', `Pelea fallida: ${code}`);
      setSubmittingId(null);
    }
  };

  const fightsTotal = 3;
  const fightsRemaining = trainingMode
    ? fightsTotal
    : brute?.fightsRemaining ?? 0;
  const fightsDisplay = trainingMode ? '∞' : `${fightsRemaining}/${fightsTotal}`;
  const fightsLabel = trainingMode ? 'Sparring' : 'Peleas hoy';

  return (
    <>
      <div className="lobby-bg" />

      <main className={clsx('lobby anim-fade-up', !showSidebar && 'no-sidebar')}>
        <BoardHeader fightsDisplay={fightsDisplay} fightsRemaining={fightsRemaining} fightsTotal={fightsTotal} fightsLabel={fightsLabel} />

        {showSidebar && (
          <aside className="lobby-side">
            {brute && <YourBrutoCard brute={brute} />}
            <TrainingLever value={trainingMode} onChange={setTrainingMode} />
          </aside>
        )}

        <section style={{ minWidth: 0 }}>
          <LobbyFilters
            current={filter}
            onChange={setFilter}
            onReroll={() => {
              setRefreshNonce((n) => n + 1);
              showToast('Tablón renovado · rivales actualizados');
            }}
          />

          {loading ? (
            <div
              className="text-center py-16 font-display uppercase"
              style={{
                color: 'var(--text-secondary)',
                letterSpacing: '0.2em',
                border: '1px dashed var(--border-shadow)',
                borderRadius: 4,
              }}
            >
              Buscando rivales en la fosa…
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="text-center py-16 font-display uppercase"
              style={{
                color: 'var(--text-secondary)',
                letterSpacing: '0.2em',
                border: '1px dashed var(--border-shadow)',
                borderRadius: 4,
              }}
            >
              Nadie cumple ese filtro hoy
            </div>
          ) : (
            <div className="op-grid">
              {filtered.map((op) => (
                <OpponentCard
                  key={op.id}
                  op={op}
                  myLevel={myLevel}
                  isTraining={trainingMode}
                  isSubmitting={submittingId === op.id}
                  disabled={submittingId !== null && submittingId !== op.id}
                  onChallenge={() => challenge(op)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {localToast && <div className="lobby-toast">{localToast}</div>}
    </>
  );
}

/* ──────────────────── Sub-componentes ──────────────────── */

function BoardHeader({
  fightsDisplay,
  fightsRemaining,
  fightsTotal,
  fightsLabel,
}: {
  fightsDisplay: string;
  fightsRemaining: number;
  fightsTotal: number;
  fightsLabel: string;
}) {
  return (
    <section className="board-header">
      <div>
        <div className="board-eyebrow">
          <span>Tablón de la fosa</span>
        </div>
      </div>
      <div className="board-title-wrap">
        <h1 className="board-title">
          A QUIÉN <span className="acc">SANGRAR</span>
        </h1>
        <div className="board-sub">Ocho almas dispuestas. Elegí la primera.</div>
      </div>
      <div className="fights-counter">
        <span className="lbl">{fightsLabel}</span>
        <span className="val">{fightsDisplay}</span>
        <span className="pips">
          {Array.from({ length: fightsTotal }).map((_, i) => (
            <span key={i} className={clsx('p', i < fightsRemaining && 'on')} />
          ))}
        </span>
      </div>
    </section>
  );
}

function YourBrutoCard({ brute }: { brute: Brute }) {
  const xpPct = Math.min(100, Math.floor((brute.xp / Math.max(1, brute.xp + 100)) * 100));
  const flavor = flavorFor(brute);
  return (
    <div className="glass your-bruto">
      <div className="glass-head">
        <span className="num">— I</span>
        <span className="title">Tu bruto</span>
      </div>
      <div className="your-bust">
        <BruteAvatar brute={brute} size="md" />
      </div>
      <h2 className="your-name">{brute.name}</h2>
      <div>
        <span className="your-rank">{flavor.rankName}</span>
      </div>
      <div className="your-lvl">
        Nivel <b>{brute.level}</b> · {xpPct}% al {brute.level + 1}
      </div>
      <div className="xp-bar">
        <div style={{ width: `${xpPct}%` }} />
      </div>
      <div className="your-stats">
        <div className="ys-cell hp">
          <div className="l">HP</div>
          <div className="v">{brute.stats.hp}</div>
        </div>
        <div className="ys-cell str">
          <div className="l">FUE</div>
          <div className="v">{brute.stats.strength}</div>
        </div>
        <div className="ys-cell agi">
          <div className="l">AGI</div>
          <div className="v">{brute.stats.agility}</div>
        </div>
        <div className="ys-cell spd">
          <div className="l">VEL</div>
          <div className="v">{brute.stats.speed}</div>
        </div>
      </div>
      <Link className="side-link" to={`/brute/${brute.id}`}>
        Ir al templo →
      </Link>
    </div>
  );
}

function TrainingLever({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={clsx('training', value && 'on')}>
      <div className="t-head">Modo entrenamiento</div>
      <div className="t-sub">No consume peleas. Sin recompensa de oro ni rachas.</div>
      <button
        type="button"
        className={clsx('lever', value && 'on')}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span className="label top">Sparring</span>
        <span className="slot" />
        <span className="handle">
          <span className="knob" />
        </span>
        <span className="label bot">Sangre real</span>
      </button>
      <div className="t-state">
        {value ? 'Sparring activo · sin coste' : 'Pelea oficial · cuenta hoy'}
      </div>
    </div>
  );
}

function LobbyFilters({
  current,
  onChange,
  onReroll,
}: {
  current: LobbyFilter;
  onChange: (f: LobbyFilter) => void;
  onReroll: () => void;
}) {
  return (
    <div className="lobby-filters">
      <span className="lbl">Filtrar</span>
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          className={clsx('chip', current === f.id && 'active')}
          onClick={() => onChange(f.id)}
        >
          {f.label}
        </button>
      ))}
      <span className="spacer" />
      <button type="button" className="reroll" onClick={onReroll}>
        ↻ Re-rollear
      </button>
    </div>
  );
}

function OpponentCard({
  op,
  myLevel,
  isTraining,
  isSubmitting,
  disabled,
  onChallenge,
}: {
  op: Brute;
  myLevel: number;
  isTraining: boolean;
  isSubmitting: boolean;
  disabled: boolean;
  onChallenge: () => void;
}) {
  const flavor = flavorFor(op);
  const advantage = op.level > myLevel ? 'tough' : op.level < myLevel ? 'easy' : 'even';

  return (
    <article className="op-card" data-adv={advantage}>
      <div className="op-frame">
        <div className="op-corner tl" />
        <div className="op-corner tr" />
        <div className="op-corner bl" />
        <div className="op-corner br" />

        <div className="op-head">
          <div className="op-bust">
            <BruteAvatar brute={op} size="sm" />
            <span className="op-lvl">N{op.level}</span>
          </div>
          <div className="op-id">
            <div className="op-name-row">
              <h3 className="op-name">{op.name}</h3>
              <span className={`op-rank rank-${flavor.rankTier}`}>{flavor.rankName}</span>
            </div>
            <StatusDot status={flavor.status} label={flavor.statusLabel} />
            <div className="op-build">
              <span className="op-build-slot" title={flavor.weapon.name}>
                <MiniGlyph kind={flavor.weapon.icon} color={flavor.color} />
              </span>
              {flavor.beast && (
                <span className="op-build-slot" title={flavor.beast.name}>
                  <BeastGlyph kind={flavor.beast.icon} color={flavor.color} />
                </span>
              )}
              <span className="op-build-text">
                {flavor.weapon.name}
                {flavor.beast ? ` · ${flavor.beast.name}` : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="op-stats">
          <WLBar wins={op.victories} losses={op.defeats} />
          <div className="op-streak">
            {flavor.streak >= 0 ? (
              <span className="streak win">▲ {flavor.streak} V</span>
            ) : (
              <span className="streak loss">▼ {Math.abs(flavor.streak)} D</span>
            )}
          </div>
        </div>

        <p className="op-rumor">
          <span className="quill">❝</span>
          <span>{flavor.rumor}</span>
        </p>

        <div className="op-foot">
          <span className="op-meta">
            <span className="last">Última pelea</span>
            <span className="last-when">{flavor.lastFight}</span>
          </span>
          <button
            type="button"
            className={clsx('op-challenge', isTraining && 'training')}
            onClick={onChallenge}
            disabled={disabled || isSubmitting}
          >
            {isSubmitting ? (
              <span>Enviando…</span>
            ) : isTraining ? (
              <>
                <span aria-hidden>⛨</span>
                <span>Sparring</span>
              </>
            ) : (
              <>
                <span aria-hidden>⚔</span>
                <span>Desafiar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusDot({ status, label }: { status: FlavorStatus; label: string }) {
  const colorMap: Record<FlavorStatus, string> = {
    online: 'var(--hp-full)',
    recent: 'var(--accent-gold)',
    cold: 'var(--text-secondary)',
  };
  const color = colorMap[status];
  return (
    <span className="status-dot" title={label}>
      <span
        className="dot"
        style={{
          background: color,
          boxShadow: status === 'online' ? `0 0 6px ${color}` : 'none',
        }}
      />
      <span className="lbl">{label}</span>
    </span>
  );
}

function WLBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses || 1;
  const wp = (wins / total) * 100;
  return (
    <div className="wl">
      <div className="wl-track">
        <div className="wl-fill" style={{ width: `${wp}%` }} />
      </div>
      <div className="wl-num">
        <span className="wl-w">{wins}V</span>
        <span className="wl-sep">·</span>
        <span className="wl-l">{losses}D</span>
      </div>
    </div>
  );
}

/* SVGs de armas y bestias (compactos). Tomados del bundle Claude Design,
 * adaptados a TS. */

function MiniGlyph({ kind, color = '#e6b450' }: { kind: WeaponIcon; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
      {kind === 'axe' && (
        <g>
          <line x1="10" y1="36" x2="38" y2="8" stroke={color} strokeWidth="2.5" />
          <path d="M28 4 L46 4 L46 22 C40 22 32 18 28 4 Z" fill="#3d2530" stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'sword' && (
        <g>
          <line x1="10" y1="38" x2="38" y2="10" stroke={color} strokeWidth="2.5" />
          <line x1="32" y1="4" x2="44" y2="16" stroke={color} strokeWidth="2" />
        </g>
      )}
      {kind === 'mace' && (
        <g>
          <line x1="12" y1="38" x2="32" y2="18" stroke={color} strokeWidth="2.5" />
          <circle cx="34" cy="14" r="8" fill="#3d2530" stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'dagger' && (
        <g>
          <path d="M24 4 L24 30 L21 36 L27 36 L24 30 Z" fill="#3d2530" stroke={color} strokeWidth="1.5" />
          <line x1="16" y1="30" x2="32" y2="30" stroke={color} strokeWidth="2" />
        </g>
      )}
      {kind === 'bow' && (
        <g>
          <path d="M14 6 Q34 24 14 42" fill="none" stroke={color} strokeWidth="2" />
          <line x1="14" y1="24" x2="40" y2="24" stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'spear' && (
        <g>
          <line x1="10" y1="40" x2="36" y2="10" stroke={color} strokeWidth="2" />
          <path d="M36 10 L42 4 L40 14 Z" fill="#3d2530" stroke={color} strokeWidth="1.2" />
        </g>
      )}
      {kind === 'flail' && (
        <g>
          <line x1="8" y1="40" x2="22" y2="22" stroke={color} strokeWidth="2" strokeDasharray="2 2" />
          <circle cx="28" cy="16" r="6" fill="#3d2530" stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'scythe' && (
        <g>
          <line x1="10" y1="40" x2="32" y2="6" stroke={color} strokeWidth="2.5" />
          <path d="M32 6 Q44 12 42 26" fill="none" stroke={color} strokeWidth="2" />
        </g>
      )}
      {kind === 'hammer' && (
        <g>
          <line x1="10" y1="40" x2="28" y2="22" stroke={color} strokeWidth="2.5" />
          <rect x="22" y="6" width="22" height="14" fill="#3d2530" stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'none' && (
        <g>
          <circle cx="24" cy="24" r="14" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 3" />
          <line x1="14" y1="14" x2="34" y2="34" stroke={color} strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

function BeastGlyph({ kind, color = '#e6b450' }: { kind: BeastIcon; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
      {kind === 'wolf' && (
        <g>
          <path
            d="M8 28 L18 14 L26 18 L34 12 L42 18 L44 30 L40 32 L38 36 L14 36 L12 32 Z"
            fill="#3d2530"
            stroke={color}
            strokeWidth="1.2"
          />
          <circle cx="20" cy="22" r="1" fill={color} />
          <circle cx="32" cy="22" r="1" fill={color} />
        </g>
      )}
      {kind === 'bear' && (
        <g>
          <ellipse cx="24" cy="28" rx="16" ry="10" fill="#3d2530" stroke={color} strokeWidth="1.2" />
          <circle cx="24" cy="18" r="7" fill="#3d2530" stroke={color} strokeWidth="1.2" />
          <circle cx="22" cy="17" r="0.8" fill={color} />
          <circle cx="26" cy="17" r="0.8" fill={color} />
        </g>
      )}
      {kind === 'panther' && (
        <g>
          <path
            d="M6 30 L14 22 L26 20 L36 18 L42 22 L42 32 L34 34 L14 34 Z"
            fill="#3d2530"
            stroke={color}
            strokeWidth="1.2"
          />
          <circle cx="38" cy="26" r="0.8" fill={color} />
        </g>
      )}
      {kind === 'rat' && (
        <g>
          <ellipse cx="22" cy="30" rx="14" ry="6" fill="#3d2530" stroke={color} strokeWidth="1.2" />
          <circle cx="34" cy="26" r="4" fill="#3d2530" stroke={color} strokeWidth="1.2" />
          <line x1="6" y1="32" x2="2" y2="38" stroke={color} strokeWidth="1" />
        </g>
      )}
      {kind === 'none' && (
        <g>
          <circle cx="24" cy="24" r="14" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 3" />
        </g>
      )}
    </svg>
  );
}
