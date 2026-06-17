import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  api,
  ApiError,
  type TournamentResponse,
  type TournamentMatch,
} from '@/api/apiClient';
import { PaperPanel } from '@/components/PaperPanel';
import { FightStage } from '@/lib/fight/Stage';

/**
 * Phase del torneo:
 *  - 'loading'    : esperando response del server
 *  - 'bracket'    : mostrando el bracket inicial, esperando "Iniciar"
 *  - 'playing'    : reproduciendo un match en curso
 *  - 'finished'   : todos los matches terminaron
 *  - 'ascension'  : pantalla "¡ASCENSO!" (solo si player ganó todo)
 *  - 'error'
 */
type Phase = 'loading' | 'bracket' | 'playing' | 'finished' | 'ascension' | 'error';

export function Tournament() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [tour, setTour] = useState<TournamentResponse | null>(null);
  const [bruteName, setBruteName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Cuál match estamos reproduciendo. Linealiza rounds[*].matches[*].
  const [matchIdx, setMatchIdx] = useState<number>(-1);
  // Resultados ya revelados (índices del array linealizado).
  const [revealedUntil, setRevealedUntil] = useState<number>(-1);

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<FightStage | null>(null);

  const flatMatches: TournamentMatch[] = useMemo(() => {
    if (!tour) return [];
    return tour.rounds.flatMap((r) => r.matches);
  }, [tour]);

  // Carga inicial.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [me, res] = await Promise.all([
          api.brutes.get(id),
          api.brutes.tournament(id),
        ]);
        if (cancelled) return;
        setBruteName(me.name);
        setTour(res);
        setPhase('bracket');
      } catch (e) {
        const code = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
        if (!cancelled) {
          setError(code);
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Cuando matchIdx cambia y estamos jugando, montar el FightStage.
  useEffect(() => {
    if (phase !== 'playing' || matchIdx < 0 || !flatMatches[matchIdx]) return;
    const container = stageContainerRef.current;
    if (!container) return;

    // Limpiar canvas previo (si quedó alguno).
    container.innerHTML = '';

    const match = flatMatches[matchIdx]!;
    const stage = new FightStage({
      view: container,
      log: match.fightLog,
      speed: 1.2,
      onComplete: () => {
        setRevealedUntil(matchIdx);
        // Avanzar al próximo match tras una pausa breve.
        window.setTimeout(() => {
          if (matchIdx + 1 < flatMatches.length) {
            setMatchIdx(matchIdx + 1);
          } else {
            // Terminó todo.
            if (tour?.ascended) {
              setPhase('ascension');
              window.setTimeout(() => setPhase('finished'), 2800);
            } else {
              setPhase('finished');
            }
          }
        }, 600);
      },
    });
    stageRef.current = stage;
    void stage.play();

    return () => {
      stage.destroy();
      stageRef.current = null;
    };
  }, [phase, matchIdx, flatMatches, tour?.ascended]);

  const startTournament = () => {
    setMatchIdx(0);
    setRevealedUntil(-1);
    setPhase('playing');
  };

  const skipMatch = () => stageRef.current?.skip();

  const skipAll = () => {
    stageRef.current?.skip();
    setRevealedUntil(flatMatches.length - 1);
    if (tour?.ascended) {
      setPhase('ascension');
      window.setTimeout(() => setPhase('finished'), 2200);
    } else {
      setPhase('finished');
    }
  };

  if (phase === 'error') {
    return (
      <div className="max-w-[957px] mx-auto py-4">
        <PaperPanel>
          <p className="text-blood font-display">No se pudo iniciar el torneo: {error}</p>
          <button className="btn mt-4" onClick={() => navigate(`/brute/${id}`)}>
            Volver
          </button>
        </PaperPanel>
      </div>
    );
  }
  if (phase === 'loading' || !tour) {
    return (
      <div className="max-w-[957px] mx-auto py-4">
        <PaperPanel>
          <p className="text-ink italic font-display text-center py-6">
            Anunciando el torneo…
          </p>
        </PaperPanel>
      </div>
    );
  }

  if (phase === 'ascension') {
    return (
      <div className="max-w-[957px] mx-auto py-4 anim-fade-up">
        <PaperPanel className="text-center">
          <div
            className="font-display text-7xl mb-3"
            style={{
              color: 'var(--accent-blood)',
              textShadow:
                '4px 4px 0 var(--btn-primary-shadow), -3px -3px 0 var(--text-strong), 0 8px 0 var(--btn-primary-shadow), 0 0 24px rgba(196, 26, 26, 0.55)',
              animation: 'vs-pop 0.6s ease-out both',
              letterSpacing: '0.05em',
              fontWeight: 900,
            }}
          >
            ¡ASCENSO!
          </div>
          <div className="font-display text-2xl text-ink-strong">
            {bruteName} se eleva en gloria.
          </div>
        </PaperPanel>
      </div>
    );
  }

  const championIsPlayer = tour.champion.id === id;
  const totalMatches = flatMatches.length;
  const currentMatch = phase === 'playing' && matchIdx >= 0 ? flatMatches[matchIdx] : null;

  return (
    <div className="max-w-[957px] mx-auto py-4 anim-fade-up">
      <PaperPanel>
        <header className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: 'var(--border-shadow)' }}>
          <div>
            <h1 className="font-display text-3xl text-ink-strong leading-none">
              Torneo
            </h1>
            <p className="text-sm text-ink italic mt-1">
              {bruteName} se enfrenta a 7 rivales en bracket de eliminación.
            </p>
          </div>
          {phase === 'bracket' && (
            <button className="btn-arena" onClick={startTournament}>
              Iniciar torneo
            </button>
          )}
          {phase === 'playing' && (
            <div className="flex gap-2">
              <button className="btn text-xs" onClick={skipMatch}>
                Saltar match
              </button>
              <button className="btn text-xs" onClick={skipAll}>
                Saltar todo
              </button>
            </div>
          )}
          {phase === 'finished' && (
            <button className="btn" onClick={() => navigate(`/brute/${id}`)}>
              Volver
            </button>
          )}
        </header>

        {/* Match en curso: arena Pixi inline */}
        {phase === 'playing' && currentMatch && (
          <div className="mb-4">
            <div className="text-xs text-ink uppercase tracking-wider text-center mb-2 font-display">
              {labelForRound(matchIdx, tour.rounds.length, tour.rounds)}{' '}
              · Match {matchIdx + 1} / {totalMatches}
            </div>
            <div className="flex justify-between items-center gap-3 mb-2 px-2">
              <div className="font-display text-base text-ink-strong">
                {currentMatch.a.name}
              </div>
              <div className="text-xs text-blood font-display">VS</div>
              <div className="font-display text-base text-ink-strong text-right">
                {currentMatch.b.name}
              </div>
            </div>
            <div ref={stageContainerRef} className="flex justify-center" />
          </div>
        )}

        {/* Bracket */}
        <div className="overflow-x-auto">
          <div className="flex gap-6 min-w-max py-2">
            {tour.rounds.map((round, ri) => (
              <BracketColumn
                key={ri}
                roundIndex={ri}
                totalRounds={tour.rounds.length}
                round={round}
                playerId={id}
                allMatches={flatMatches}
                revealedUntil={revealedUntil}
                currentMatchIdx={matchIdx}
                phase={phase}
              />
            ))}

            {/* Columna de campeón al final */}
            <div className="flex flex-col justify-center min-w-[180px]">
              <div className="text-xs text-ink uppercase tracking-wider text-center mb-2 font-display">
                Campeón
              </div>
              <ChampionCard
                name={tour.champion.name}
                highlight={championIsPlayer}
                revealed={phase === 'finished'}
              />
            </div>
          </div>
        </div>

        {phase === 'finished' && tour.ascended && (
          <div className="mt-4 text-center font-display text-base text-ink-strong">
            ★ {bruteName} asciende de rango ★
          </div>
        )}
        {phase === 'bracket' && (
          <p className="mt-4 text-xs text-ink italic text-center">
            8 brutos. 7 matches. Click "Iniciar torneo" para reproducir cada pelea.
          </p>
        )}
      </PaperPanel>
    </div>
  );
}

function labelForRound(matchIdx: number, totalRounds: number, rounds: TournamentResponse['rounds']): string {
  // Encuentra qué ronda corresponde al matchIdx.
  let cum = 0;
  for (let ri = 0; ri < rounds.length; ri++) {
    const len = rounds[ri]!.matches.length;
    if (matchIdx < cum + len) {
      if (ri === totalRounds - 1) return 'Final';
      if (ri === totalRounds - 2) return 'Semifinal';
      return `Ronda ${ri + 1}`;
    }
    cum += len;
  }
  return '';
}

function BracketColumn({
  round,
  roundIndex,
  totalRounds,
  playerId,
  allMatches,
  revealedUntil,
  currentMatchIdx,
  phase,
}: {
  round: TournamentResponse['rounds'][number];
  roundIndex: number;
  totalRounds: number;
  playerId: string;
  allMatches: TournamentMatch[];
  revealedUntil: number;
  currentMatchIdx: number;
  phase: Phase;
}) {
  const gap = 10 + roundIndex * 14;
  const roundLabel =
    roundIndex === totalRounds - 1
      ? 'Final'
      : roundIndex === totalRounds - 2
        ? 'Semifinal'
        : `Ronda ${roundIndex + 1}`;

  return (
    <div className="flex flex-col" style={{ gap, minWidth: 200 }}>
      <div className="text-xs text-ink uppercase tracking-wider text-center font-display">
        {roundLabel}
      </div>
      {round.matches.map((m, mi) => {
        const flatIdx = allMatches.indexOf(m);
        const isRevealed = phase === 'bracket' ? false : flatIdx <= revealedUntil;
        const isCurrent = phase === 'playing' && flatIdx === currentMatchIdx;
        return (
          <MatchCard
            key={`${roundIndex}-${mi}`}
            match={m}
            playerId={playerId}
            revealed={isRevealed}
            current={isCurrent}
          />
        );
      })}
    </div>
  );
}

function MatchCard({
  match,
  playerId,
  revealed,
  current,
}: {
  match: TournamentMatch;
  playerId: string;
  revealed: boolean;
  current: boolean;
}) {
  const winnerSide = match.winner;
  const playerInMatch = match.a.id === playerId || match.b.id === playerId;
  const playerWon =
    revealed &&
    ((match.a.id === playerId && winnerSide === 'A') ||
      (match.b.id === playerId && winnerSide === 'B'));

  return (
    <div
      className={clsx(
        'rounded p-2 text-sm transition-all',
        playerInMatch && revealed && 'shadow-rune-strong',
        current && 'ring-2 ring-blood',
      )}
      style={{
        background: playerInMatch
          ? 'var(--paper-accent)'
          : current
            ? 'var(--paper-dark)'
            : 'var(--paper)',
        border: '2px solid var(--border-inner)',
        boxShadow: current
          ? 'inset 0 0 0 2px var(--accent-blood), 0 0 14px rgba(196, 26, 26, 0.45)'
          : 'inset 0 0 0 1px var(--border-outer), 0 0 8px rgba(0, 0, 0, 0.5)',
      }}
    >
      <FighterRow
        name={match.a.name}
        won={revealed && winnerSide === 'A'}
        isPlayer={match.a.id === playerId}
        revealed={revealed}
      />
      <div className="text-center text-[10px] text-ink-strong opacity-50 my-0.5">
        vs
      </div>
      <FighterRow
        name={match.b.name}
        won={revealed && winnerSide === 'B'}
        isPlayer={match.b.id === playerId}
        revealed={revealed}
      />
      {playerInMatch && revealed && (
        <div
          className={clsx(
            'mt-1 text-[10px] font-display text-center uppercase tracking-wider',
            playerWon ? 'text-ink-strong' : 'text-blood',
          )}
        >
          {playerWon ? 'Victoria' : 'Eliminado'}
        </div>
      )}
      {current && (
        <div className="mt-1 text-[10px] font-display text-center uppercase tracking-wider text-blood animate-pulse">
          Peleando
        </div>
      )}
    </div>
  );
}

function FighterRow({
  name,
  won,
  isPlayer,
  revealed,
}: {
  name: string;
  won: boolean;
  isPlayer: boolean;
  revealed: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between px-2 py-1 rounded',
        won ? 'font-display' : 'text-ink',
        !revealed && 'opacity-90',
      )}
      style={
        won
          ? {
              background: 'linear-gradient(180deg, #fae57a 0%, #d8a74c 100%)',
              color: 'var(--text-strong)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
            }
          : undefined
      }
    >
      <span className={clsx('truncate text-xs', isPlayer && 'underline decoration-dotted')}>
        {name}
      </span>
      {won && <span className="text-xs">✓</span>}
    </div>
  );
}

function ChampionCard({
  name,
  highlight,
  revealed,
}: {
  name: string;
  highlight: boolean;
  revealed: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center p-4 rounded text-center transition-all"
      style={{
        background: revealed
          ? highlight
            ? 'linear-gradient(180deg, var(--accent-gold) 0%, #a87f30 100%)'
            : 'var(--paper-accent)'
          : 'var(--paper)',
        border: '3px solid var(--border-inner)',
        boxShadow: highlight && revealed
          ? 'inset 0 0 0 1px var(--border-outer), 0 0 18px rgba(230, 180, 80, 0.5)'
          : 'inset 0 0 0 1px var(--border-outer), 0 0 12px rgba(0, 0, 0, 0.55)',
        minHeight: 100,
        opacity: revealed ? 1 : 0.5,
      }}
    >
      <div className="text-3xl mb-1" aria-hidden>
        🏆
      </div>
      <div className="font-display text-lg text-ink-strong">
        {revealed ? name : '???'}
      </div>
      {revealed && highlight && (
        <div className="text-xs text-blood font-display mt-1 uppercase tracking-wider">
          ¡Tu bruto!
        </div>
      )}
    </div>
  );
}
