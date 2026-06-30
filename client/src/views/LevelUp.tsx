// LevelUp — Blessing after leveling up.
// Visual treatment dark fantasy estilo Slay-the-Spire/Hades 2: 2 cards de
// elección con border-top color por tipo (stat=sangre, skill=oro,
// weapon=bronce, pet=verde). Lógica preservada: pendingLevelUp del store +
// api.brutes.levelup + navegación post-click.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '@/api/apiClient';
import type { LevelUpChoice } from 'core';
import { getPet, getSkill, getWeapon } from 'core';
import { useToastStore } from '@/store/useToastStore';
import { useGameStore } from '@/store/useGameStore';
import { CombatGlyph } from '@/components/combat/CombatGlyph';

export function LevelUp() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);
  const pending = useGameStore((s) => s.pendingLevelUp);
  const setPendingLevelUp = useGameStore((s) => s.setPendingLevelUp);
  const offer = pending && pending.bruteId === id ? pending.offer : null;

  const [submitting, setSubmitting] = useState<boolean>(false);

  const choose = async (choice: LevelUpChoice) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.brutes.levelup(id, { choice });
      setPendingLevelUp(null);
      pushToast('success', 'Blessing forged!');
      navigate(`/brute/${id}`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
      pushToast('error', `Could not apply: ${code}`);
      setSubmitting(false);
    }
  };

  if (!offer) {
    return (
      <div className="levelup-shell">
        <header className="levelup-hero">
          <div className="eyebrow">
            <span>Forge interrupted</span>
          </div>
          <h1>
            No <em>blessing</em>
          </h1>
        </header>
        <div className="levelup-empty">
          <div className="empty-mark">No pending level-up</div>
          <div className="empty-sub">Return to the pit and forge your next victory.</div>
          <button className="btn" onClick={() => navigate(`/brute/${id}`)}>
            Back to temple
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="levelup-shell anim-fade-up">
      <header className="levelup-hero">
        <div className="eyebrow">
          <span>You leveled up</span>
        </div>
        <h1>
          Forge your <em>blessing</em>
        </h1>
        <div className="sub">One choice. Forever.</div>
        <div className="instruction">
          Two paths open before you. Choose the one that will shape your next fight.
        </div>
      </header>

      <div className="levelup-choices">
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
  const { title, description, kindLabel, glyph } = describeChoice(choice);
  return (
    <button
      type="button"
      onClick={() => onSelect(choice)}
      disabled={disabled}
      className="levelup-card"
      data-kind={choice.kind}
    >
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />

      <span className="levelup-kind">{kindLabel}</span>
      <div className="levelup-icon">
        <CombatGlyph kind={glyph} color={glyphColor(choice.kind)} />
      </div>
      <h3 className="levelup-title">{title}</h3>
      <p className="levelup-desc">{description}</p>
      <div className="levelup-pick">
        <span>Forge this path</span>
        <span className="arrow" aria-hidden>
          ›
        </span>
      </div>
    </button>
  );
}

function glyphColor(kind: LevelUpChoice['kind']): string {
  switch (kind) {
    case 'stat': return '#c41a1a';
    case 'skill': return '#e6b450';
    case 'weapon': return '#8a6038';
    case 'pet': return '#5fb04a';
  }
}

interface ChoiceDescription {
  title: string;
  description: string;
  kindLabel: string;
  glyph: string;
}

function describeChoice(c: LevelUpChoice): ChoiceDescription {
  switch (c.kind) {
    case 'stat': {
      const main = `+${c.amount} ${labelStat(c.stat)}`;
      const second =
        c.secondStat !== undefined && c.secondAmount !== undefined
          ? ` · +${c.secondAmount} ${labelStat(c.secondStat)}`
          : '';
      return {
        title: `${main}${second}`,
        description: 'Your attributes are tempered. A permanent upgrade born from fire.',
        kindLabel: 'Attribute',
        glyph: 'rage',
      };
    }
    case 'skill': {
      const e = getSkill(c.skillId);
      return {
        title: e?.name ?? c.skillId,
        description: e?.description ?? 'Unknown skill.',
        kindLabel: 'Skill',
        glyph: mapSkillGlyph(c.skillId),
      };
    }
    case 'weapon': {
      const e = getWeapon(c.weaponId);
      return {
        title: e?.name ?? c.weaponId,
        description: e?.description ?? 'Unknown weapon.',
        kindLabel: 'Weapon',
        glyph: mapWeaponGlyph(c.weaponId),
      };
    }
    case 'pet': {
      const e = getPet(c.petId);
      return {
        title: e?.name ?? c.petId,
        description: e?.description ?? 'Unknown beast.',
        kindLabel: 'Beast',
        glyph: 'fury',
      };
    }
  }
}

function labelStat(stat: string): string {
  switch (stat) {
    case 'hp': return 'Vitality';
    case 'strength': return 'Strength';
    case 'agility': return 'Agility';
    case 'speed': return 'Speed';
    default: return stat;
  }
}

function mapSkillGlyph(id: string): string {
  const map: Record<string, string> = {
    iron_skin: 'shield',
    block: 'shield',
    counter: 'counter',
    poison: 'poison',
    regeneration: 'heal',
    survival: 'heal',
    vampirism: 'poison',
    fierce_brute: 'rage',
    herculean_strength: 'rage',
    cry_of_the_damned: 'flame',
    hammer: 'hammer',
    bomb: 'bomb',
    thief: 'dagger',
    martial_arts: 'counter',
    feline_agility: 'fury',
    lightning_bolt: 'flame',
    swift_wind: 'fury',
    haste: 'fury',
    weapons_master: 'sword',
  };
  return map[id] ?? 'shield';
}

function mapWeaponGlyph(id: string): string {
  const blunt = ['mug', 'mighty_hammer', 'frying_pan', 'morning_star', 'flail', 'wrench', 'bo_staff', 'noodle_bowl', 'nunchaku', 'chain_whip'];
  const blade = ['knife', 'dagger', 'axe', 'hatchet', 'scimitar', 'broadsword', 'katana', 'claymore', 'rapier', 'sai', 'shuriken', 'fan'];
  const spear = ['lance', 'halberd', 'trident'];
  if (blade.includes(id)) {
    if (id === 'knife' || id === 'dagger' || id === 'sai') return 'dagger';
    if (id === 'axe' || id === 'hatchet') return 'axe';
    return 'sword';
  }
  if (spear.includes(id)) return 'spear';
  if (blunt.includes(id)) {
    if (id === 'flail' || id === 'morning_star' || id === 'chain_whip' || id === 'nunchaku') return 'flail';
    if (id === 'mighty_hammer') return 'hammer';
    return 'mace';
  }
  if (id === 'whip') return 'flail';
  if (id === 'crossbow') return 'bow';
  return 'sword';
}
