import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { api, ApiError } from '@/api/apiClient';
import { useBrute } from '@/hooks/useBrute';
import { BruteCard } from '@/components/BruteCard';
import type { Brute } from 'core';
import { useToastStore } from '@/store/useToastStore';
import { useGameStore } from '@/store/useGameStore';

export function Arena() {
  const { id = '' } = useParams<{ id: string }>();
  const { brute } = useBrute(id);
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);

  const [training, setTraining] = useState<boolean>(false);
  const [opponents, setOpponents] = useState<Brute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const list = await api.brutes.opponents(id, training);
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
  }, [id, training, pushToast]);

  const setLastFight = useGameStore((s) => s.setLastFight);
  const setLastLevelUpOffer = useGameStore((s) => s.setLastLevelUpOffer);

  const fight = async (opponentId: string) => {
    if (submittingId) return;
    setSubmittingId(opponentId);
    try {
      const res = await api.brutes.fight(id, { opponentId, training });
      setLastFight(res);
      setLastLevelUpOffer(res.leveledUp && res.levelUpChoices ? res.levelUpChoices : null);
      navigate(`/brute/${id}/fight/${res.combat.id}`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
      pushToast('error', `Pelea fallida: ${code}`);
      setSubmittingId(null);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-gold">Arena</h1>
        <Link to={`/brute/${id}`} className="btn">Cancelar</Link>
      </header>

      <div className="panel p-4 mb-6 flex items-center gap-4">
        {(['real', 'training'] as const).map((mode) => {
          const isActive = (mode === 'training') === training;
          const remaining =
            mode === 'training'
              ? brute?.trainingFightsRemaining ?? 0
              : brute?.fightsRemaining ?? 0;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTraining(mode === 'training')}
              className={clsx(
                'btn',
                isActive && 'border-gold text-gold shadow-rune-strong',
              )}
              aria-pressed={isActive}
            >
              {mode === 'real' ? 'Pelea normal' : 'Entrenamiento'}
              <span className="text-xs text-muted ml-2">({remaining})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-muted">Buscando rivales…</div>
      ) : opponents.length === 0 ? (
        <div className="text-muted italic">Nadie quiere pelear contigo ahora.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {opponents.map((opp) => (
            <BruteCard
              key={opp.id}
              brute={opp}
              onClick={() => fight(opp.id)}
              selected={submittingId === opp.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
