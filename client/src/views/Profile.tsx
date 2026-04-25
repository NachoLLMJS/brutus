import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBrute } from '@/hooks/useBrute';
import { BruteAvatar } from '@/components/BruteAvatar';
import { BruteCard } from '@/components/BruteCard';
import { HPBar } from '@/components/HPBar';
import { StatRow } from '@/components/StatRow';
import { SkillBadge } from '@/components/SkillBadge';
import { WeaponBadge } from '@/components/WeaponBadge';
import { PetBadge } from '@/components/PetBadge';
import { api } from '@/api/apiClient';
import type { Brute } from 'core';
import { xpToNext } from 'core';
import { formatRank } from '@/lib/format';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/store/useToastStore';

export function Profile() {
  const { id = '' } = useParams<{ id: string }>();
  const { brute, loading, error } = useBrute(id);
  const navigate = useNavigate();
  const rememberBrute = useGameStore((s) => s.rememberBrute);
  const pushToast = useToastStore((s) => s.push);

  const [pupils, setPupils] = useState<Brute[]>([]);

  useEffect(() => {
    if (brute) {
      rememberBrute({ id: brute.id, name: brute.name, level: brute.level });
    }
  }, [brute, rememberBrute]);

  useEffect(() => {
    if (!brute) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await api.brutes.pupils(brute.id);
        if (!cancelled) setPupils(list);
      } catch {
        // silencioso: pupils es secundario
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brute]);

  if (loading && !brute) {
    return <div className="p-6 text-muted">Convocando…</div>;
  }
  if (error || !brute) {
    return (
      <div className="p-6">
        <p className="text-blood">Error: {error ?? 'no se encontró el bruto.'}</p>
        <Link to="/" className="btn mt-4">Volver</Link>
      </div>
    );
  }

  const xpMax = xpToNext(brute.level);
  const noFights = brute.fightsRemaining <= 0 && brute.trainingFightsRemaining <= 0;
  const rankLabel = formatRank(brute.rank);

  const copyMasterLink = async () => {
    const url = `${window.location.origin}/create?master=${brute.id}`;
    try {
      await navigator.clipboard.writeText(url);
      pushToast('success', 'Enlace de discípulo copiado.');
    } catch {
      pushToast('error', 'No se pudo copiar.');
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="flex items-center gap-4 mb-6">
        <BruteAvatar appearance={brute.appearance} size="lg" />
        <div>
          <h1 className="font-serif text-4xl text-ink">
            {brute.name}
            {rankLabel && <span className="text-gold text-2xl ml-3">· {rankLabel}</span>}
          </h1>
          <div className="text-muted">Nivel {brute.level}</div>
          <div className="mt-2 w-72">
            <HPBar value={brute.xp} max={xpMax} label="XP" />
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="panel p-4 flex flex-col gap-3">
          <h2 className="font-serif text-xl text-gold">Atributos</h2>
          <HPBar value={brute.stats.hp} max={brute.stats.hp} label="HP" />
          <StatRow label="Fuerza" statKey="strength" value={brute.stats.strength} />
          <StatRow label="Agilidad" statKey="agility" value={brute.stats.agility} />
          <StatRow label="Velocidad" statKey="speed" value={brute.stats.speed} />
        </div>

        <div className="panel p-4 flex flex-col gap-3">
          <h2 className="font-serif text-xl text-gold">Arsenal</h2>
          <Section title="Habilidades">
            {brute.skills.length === 0
              ? <span className="text-muted text-sm italic">ninguna aún</span>
              : brute.skills.map((s) => <SkillBadge key={s} skillId={s} />)}
          </Section>
          <Section title="Armas">
            {brute.weapons.length === 0
              ? <span className="text-muted text-sm italic">ninguna aún</span>
              : brute.weapons.map((w) => <WeaponBadge key={w} weaponId={w} />)}
          </Section>
          <Section title="Mascotas">
            {brute.pets.length === 0
              ? <span className="text-muted text-sm italic">ninguna aún</span>
              : brute.pets.map((p) => <PetBadge key={p} petId={p} />)}
          </Section>
        </div>
      </div>

      <div className="panel p-4 mb-6 flex flex-wrap gap-6 text-sm text-muted">
        <Stat label="Peleas" value={`${brute.fightsRemaining}/5`} />
        <Stat label="Training" value={`${brute.trainingFightsRemaining}/10`} />
        <Stat label="Derrotas hoy" value={`${brute.defeatsToday}/3`} />
        <Stat label="Récord" value={`${brute.victories}V / ${brute.defeats}D`} />
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          type="button"
          onClick={() => navigate(`/brute/${brute.id}/arena`)}
          disabled={noFights}
          className="btn-primary animate-pulse"
        >
          Buscar pelea
        </button>
        <button
          type="button"
          onClick={() => navigate(`/brute/${brute.id}/tournament`)}
          disabled={brute.level < 3}
          className="btn-gold"
          title={brute.level < 3 ? 'Requiere nivel 3' : undefined}
        >
          Torneo
        </button>
        <Link to="/" className="btn">Cambiar bruto</Link>
        <button type="button" onClick={copyMasterLink} className="btn">
          Copiar enlace de discípulo
        </button>
      </div>

      <section>
        <h2 className="font-serif text-2xl text-gold mb-3">Discípulos</h2>
        {pupils.length === 0 ? (
          <p className="text-muted italic">Aún no formaste discípulos.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pupils.map((p) => (
              <BruteCard key={p.id} brute={p} onClick={() => navigate(`/brute/${p.id}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1 uppercase tracking-wider">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider">{label}</div>
      <div className="text-ink font-serif text-base">{value}</div>
    </div>
  );
}
