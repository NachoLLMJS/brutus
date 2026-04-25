import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { api, ApiError } from '@/api/apiClient';
import type { LevelUpChoice } from 'core';
import { getPet, getSkill, getWeapon } from 'core';
import { useToastStore } from '@/store/useToastStore';
import { useGameStore } from '@/store/useGameStore';

export function LevelUp() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);
  const offer = useGameStore((s) => s.lastLevelUpOffer);
  const setLastLevelUpOffer = useGameStore((s) => s.setLastLevelUpOffer);

  const [submitting, setSubmitting] = useState<boolean>(false);

  const choose = async (choice: LevelUpChoice) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.brutes.levelup(id, { choice });
      setLastLevelUpOffer(null);
      pushToast('success', '¡Nivel ganado!');
      navigate(`/brute/${id}`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
      pushToast('error', `No se pudo aplicar: ${code}`);
      setSubmitting(false);
    }
  };

  if (!offer) {
    return (
      <div className="p-6 text-blood">
        No hay subida de nivel pendiente.
        <button className="btn ml-3" onClick={() => navigate(`/brute/${id}`)}>Volver</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl text-gold mb-2">Has subido de nivel</h1>
      <p className="text-muted mb-6">Elige una bendición. Sólo una.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChoiceCard choice={offer.first} onSelect={choose} disabled={submitting} />
        <ChoiceCard choice={offer.second} onSelect={choose} disabled={submitting} />
      </div>
    </div>
  );
}

interface ChoiceCardProps {
  choice: LevelUpChoice;
  onSelect: (c: LevelUpChoice) => void;
  disabled: boolean;
}

function ChoiceCard({ choice, onSelect, disabled }: ChoiceCardProps) {
  const { title, description } = describeChoice(choice);
  return (
    <button
      type="button"
      onClick={() => onSelect(choice)}
      disabled={disabled}
      className={clsx(
        'panel p-4 text-left transition-all duration-200',
        'hover:border-gold hover:shadow-rune-strong hover:-translate-y-0.5',
        'focus:outline-none focus:border-gold focus:shadow-rune-strong',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      <div className="text-xs uppercase tracking-wider text-muted">{choice.kind}</div>
      <div className="font-serif text-xl text-ink mt-1">{title}</div>
      <p className="text-sm text-muted mt-2">{description}</p>
    </button>
  );
}

function describeChoice(c: LevelUpChoice): { title: string; description: string } {
  switch (c.kind) {
    case 'stat': {
      const main = `+${c.amount} ${c.stat}`;
      const second =
        c.secondStat !== undefined && c.secondAmount !== undefined
          ? ` y +${c.secondAmount} ${c.secondStat}`
          : '';
      return {
        title: `${main}${second}`,
        description: 'Mejora permanente de atributos.',
      };
    }
    case 'skill': {
      const e = getSkill(c.skillId);
      return {
        title: e?.name ?? c.skillId,
        description: e?.description ?? 'Habilidad desconocida.',
      };
    }
    case 'weapon': {
      const e = getWeapon(c.weaponId);
      return {
        title: e?.name ?? c.weaponId,
        description: e?.description ?? 'Arma desconocida.',
      };
    }
    case 'pet': {
      const e = getPet(c.petId);
      return {
        title: e?.name ?? c.petId,
        description: e?.description ?? 'Mascota desconocida.',
      };
    }
  }
}
