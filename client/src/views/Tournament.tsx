import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { api, ApiError } from '@/api/apiClient';
import type { Tournament as TournamentT, TournamentMatch } from 'core';

export function Tournament() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tour, setTour] = useState<TournamentT | null>(null);
  const [bruteName, setBruteName] = useState<string>('');
  const [bruteRank, setBruteRank] = useState<number>(0);
  const [showAscension, setShowAscension] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        setTour(res.tournament);
        const playerWonAll =
          res.tournament.champion === id && res.bruteAfter.rank > me.rank;
        setBruteRank(res.bruteAfter.rank);
        if (playerWonAll) {
          setShowAscension(true);
          window.setTimeout(() => {
            if (!cancelled) setShowAscension(false);
          }, 2500);
        }
      } catch (e) {
        const code = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
        if (!cancelled) setError(code);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="p-6 text-blood">
        No se pudo iniciar el torneo: {error}
        <button className="btn ml-3" onClick={() => navigate(`/brute/${id}`)}>Volver</button>
      </div>
    );
  }
  if (!tour) {
    return <div className="p-6 text-muted">Anunciando el torneo…</div>;
  }

  if (showAscension) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="font-serif text-5xl text-gold mb-2 tracking-widest">
            ASCENSO
          </div>
          <div className="font-serif text-2xl text-ink">a Rango {bruteRank}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-gold">Torneo de {bruteName}</h1>
        <button className="btn" onClick={() => navigate(`/brute/${id}`)}>
          Continuar
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tour.rounds.map((round, ri) => (
          <div key={ri} className="panel p-3 flex flex-col gap-3">
            <h2 className="font-serif text-lg text-gold">Ronda {ri + 1}</h2>
            {round.map((m) => (
              <MatchCard key={`${m.round}-${m.index}`} match={m} playerId={id} />
            ))}
          </div>
        ))}
      </div>

      {tour.champion && (
        <div className="panel p-4 mt-6 text-center">
          <span className="text-muted">Campeón: </span>
          <span className="font-serif text-xl text-gold">
            {tour.champion === id ? bruteName : 'rival'}
          </span>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, playerId }: { match: TournamentMatch; playerId: string }) {
  const isBye = match.a === null || match.b === null;
  return (
    <div
      className={clsx(
        'border border-arcane rounded p-2 bg-elevated text-sm',
        match.winner === playerId && 'border-gold shadow-rune',
      )}
    >
      <div className="flex justify-between">
        <span className={clsx(match.winner === match.a && 'text-gold')}>
          {match.a ?? '—'}
        </span>
        <span className="text-muted">vs</span>
        <span className={clsx(match.winner === match.b && 'text-gold')}>
          {match.b ?? '—'}
        </span>
      </div>
      {isBye && <div className="text-xs text-muted italic">bye</div>}
    </div>
  );
}
