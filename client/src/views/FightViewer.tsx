import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPet, getSkill } from 'core';
import { api } from '@/api/apiClient';
import { BruteAvatar } from '@/components/BruteAvatar';
import { HPBar } from '@/components/HPBar';
import { useFight } from '@/hooks/useFight';
import type {
  Appearance,
  Brute,
  CombatStep,
  FighterSide,
  FighterSnapshot,
} from 'core';
import { useToastStore } from '@/store/useToastStore';
import { useGameStore } from '@/store/useGameStore';

interface FighterRuntime {
  snapshot: FighterSnapshot;
  hp: number;
  swing: number;
  hitFlash: number;
}

interface FightData {
  log: CombatStep[];
  bruteAfter: Brute;
  xpGained: number;
  appearances: Record<FighterSide, Appearance | null>;
}

const DEFAULT_APPEARANCE: Appearance = {
  gender: 'M',
  skin: '#d8a87a',
  hair: '#1a0f0a',
  shirt: '#2a1838',
  pants: '#1a1410',
};

export function FightViewer() {
  const { id = '' } = useParams<{ id: string; fid: string }>();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);
  const lastFight = useGameStore((s) => s.lastFight);

  const [data, setData] = useState<FightData | null>(null);

  useEffect(() => {
    if (!lastFight) return;
    let cancelled = false;
    void (async () => {
      const start = lastFight.combat.log.find(
        (s): s is Extract<CombatStep, { type: 'start' }> => s.type === 'start',
      );
      const appearances: Record<FighterSide, Appearance | null> = { A: null, B: null };
      if (start) {
        const ids: Array<{ side: FighterSide; bruteId: string }> = [
          { side: 'A', bruteId: start.fighters.A.bruteId },
          { side: 'B', bruteId: start.fighters.B.bruteId },
        ];
        await Promise.all(
          ids.map(async ({ side, bruteId }) => {
            try {
              const b = await api.brutes.get(bruteId);
              appearances[side] = b.appearance;
            } catch {
              appearances[side] = null;
            }
          }),
        );
      }
      if (!cancelled) {
        setData({
          log: lastFight.combat.log,
          bruteAfter: lastFight.brute,
          // El server ya aplicó el XP; calculamos lo ganado por delta vs nivel/xp previos.
          // Para la UI alcanza con un valor estable: 1 si ganó, 0 si perdió (XP=1 por victoria).
          xpGained: lastFight.combat.winner === 'A' ? 1 : 0,
          appearances,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lastFight]);

  if (!lastFight) {
    return (
      <div className="p-6 text-blood">
        No hay combate activo.
        <button className="btn ml-3" onClick={() => navigate(`/brute/${id}`)}>Volver al perfil</button>
      </div>
    );
  }
  if (!data) {
    return <div className="p-6 text-muted">Convocando el combate…</div>;
  }

  return (
    <FightStage
      log={data.log}
      appearances={data.appearances}
      onContinue={() => {
        const offer = lastFight.leveledUp ? lastFight.levelUpChoices : undefined;
        if (offer) {
          navigate(`/brute/${id}/levelup`);
        } else {
          navigate(`/brute/${id}`);
        }
        pushToast('info', `+${data.xpGained} XP`);
      }}
    />
  );
}

interface FightStageProps {
  log: CombatStep[];
  appearances: Record<FighterSide, Appearance | null>;
  onContinue: () => void;
}

function FightStage({ log, appearances, onContinue }: FightStageProps) {
  const start = useMemo(
    () =>
      log.find((s): s is Extract<CombatStep, { type: 'start' }> => s.type === 'start'),
    [log],
  );
  const { current, recent, finished, skip } = useFight({ log });

  const [a, setA] = useState<FighterRuntime | null>(null);
  const [b, setB] = useState<FighterRuntime | null>(null);

  useEffect(() => {
    if (!start) return;
    setA({ snapshot: start.fighters.A, hp: start.fighters.A.hp, swing: 0, hitFlash: 0 });
    setB({ snapshot: start.fighters.B, hp: start.fighters.B.hp, swing: 0, hitFlash: 0 });
  }, [start]);

  useEffect(() => {
    if (!current) return;
    applyStep(current, setA, setB);
    const t = window.setTimeout(() => {
      setA((s) => (s ? { ...s, swing: 0, hitFlash: 0 } : s));
      setB((s) => (s ? { ...s, swing: 0, hitFlash: 0 } : s));
    }, 350);
    return () => window.clearTimeout(t);
  }, [current]);

  const winner = useMemo(() => {
    const end = log.find((s): s is Extract<CombatStep, { type: 'end' }> => s.type === 'end');
    return end ? end.winner : null;
  }, [log]);

  if (!start || !a || !b) {
    return <div className="p-6 text-muted">Preparando arena…</div>;
  }

  const appA = appearances.A ?? DEFAULT_APPEARANCE;
  const appB = appearances.B ?? DEFAULT_APPEARANCE;

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-2xl text-gold">Arena</h1>
        {!finished && <button className="btn" onClick={skip}>Saltar</button>}
      </div>

      <div className="panel p-4">
        <div className="flex justify-between gap-4 mb-3">
          <FighterPanel runtime={a} side="A" />
          <FighterPanel runtime={b} side="B" />
        </div>

        <div className="relative w-full h-[300px] bg-deep border border-arcane rounded overflow-hidden flex items-end justify-around px-8">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />
          <BruteAvatar
            appearance={appA}
            size="lg"
            anim={{
              facing: 'right',
              swing: a.swing,
              hitFlash: a.hitFlash,
              hpPct: a.hp / a.snapshot.hpMax,
            }}
          />
          <BruteAvatar
            appearance={appB}
            size="lg"
            anim={{
              facing: 'left',
              swing: b.swing,
              hitFlash: b.hitFlash,
              hpPct: b.hp / b.snapshot.hpMax,
            }}
          />
        </div>
      </div>

      <div className="panel p-3 text-sm font-sans space-y-1 min-h-[8rem]">
        {recent.map((step, i) => (
          <div key={i} className="text-muted">
            {narrate(step, start.fighters)}
          </div>
        ))}
      </div>

      {finished && (
        <div className="panel p-6 text-center animate-rise-in">
          <div className="font-serif text-3xl text-gold mb-3">
            🏆 {winner === 'A' ? start.fighters.A.name : start.fighters.B.name} gana
          </div>
          <button className="btn-primary" onClick={onContinue}>
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}

function FighterPanel({ runtime, side }: { runtime: FighterRuntime; side: FighterSide }) {
  const isA = side === 'A';
  return (
    <div className={`flex-1 ${isA ? '' : 'text-right'}`}>
      <div className="font-serif text-lg text-ink">{runtime.snapshot.name}</div>
      <HPBar value={runtime.hp} max={runtime.snapshot.hpMax} />
    </div>
  );
}

function applyStep(
  step: CombatStep,
  setA: React.Dispatch<React.SetStateAction<FighterRuntime | null>>,
  setB: React.Dispatch<React.SetStateAction<FighterRuntime | null>>,
): void {
  const apply = (
    side: FighterSide,
    fn: (r: FighterRuntime) => FighterRuntime,
  ) => {
    const updater = (s: FighterRuntime | null) => (s ? fn(s) : s);
    if (side === 'A') setA(updater);
    else setB(updater);
  };
  switch (step.type) {
    case 'attack':
      apply(step.attacker, (r) => ({ ...r, swing: 1 }));
      apply(step.defender, (r) => ({ ...r, hp: step.remainingHp, hitFlash: 1 }));
      break;
    case 'counter':
      apply(step.defender, (r) => ({ ...r, swing: 1 }));
      apply(step.attacker, (r) => ({ ...r, hp: step.remainingHp, hitFlash: 1 }));
      break;
    case 'heal':
      apply(step.side, (r) => ({ ...r, hp: step.remainingHp }));
      break;
    case 'pet_attack':
      apply(step.defender, (r) => ({ ...r, hp: step.remainingHp, hitFlash: 1 }));
      break;
    case 'revive':
      apply(step.side, (r) => ({ ...r, hp: step.hp }));
      break;
    default:
      break;
  }
}

function narrate(
  step: CombatStep,
  fighters: { A: FighterSnapshot; B: FighterSnapshot },
): string {
  const name = (s: FighterSide) => fighters[s].name;
  switch (step.type) {
    case 'start':
      return `Comienza el combate: ${fighters.A.name} vs ${fighters.B.name}.`;
    case 'turn':
      return `Turno ${step.turn} — actúa ${name(step.side)}.`;
    case 'attack':
      return `${name(step.attacker)} ataca a ${name(step.defender)} (-${step.damage} HP)${step.critical ? ' ¡crítico!' : ''}.`;
    case 'dodge':
      return `${name(step.defender)} esquiva el ataque.`;
    case 'block':
      return `${name(step.defender)} bloquea.`;
    case 'counter':
      return `${name(step.defender)} contraataca (-${step.damage} HP a ${name(step.attacker)}).`;
    case 'skill': {
      const skillName = getSkill(step.skillId)?.name ?? step.skillId;
      return `${name(step.side)} usa ${skillName}${step.detail ? `: ${step.detail}` : ''}.`;
    }
    case 'heal':
      return `${name(step.side)} recupera ${step.amount} HP.`;
    case 'pet_join': {
      const petName = getPet(step.petId)?.name ?? step.petId;
      return `${name(step.side)} libera a su mascota (${petName}).`;
    }
    case 'pet_attack': {
      const petName = getPet(step.petId)?.name ?? step.petId;
      return `${petName} de ${name(step.attacker)} muerde a ${name(step.defender)} (-${step.damage}).`;
    }
    case 'pet_death': {
      const petName = getPet(step.petId)?.name ?? step.petId;
      return `La mascota (${petName}) de ${name(step.side)} cae.`;
    }
    case 'death':
      return `${name(step.side)} cae derrotado.`;
    case 'revive':
      return `¡${name(step.side)} se aferra a la vida!`;
    case 'end':
      return `Fin del combate. Vence ${name(step.winner)}.`;
  }
}
