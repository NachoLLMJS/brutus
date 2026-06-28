// FighterCard (combat top) — bust circular + nombre + rank chip + HPBarV2 +
// glyphs de arma/skills. Lado left (azul/dorado) o right (verde tóxico).
//
// FightFighter (del log) solo trae name/hp/avatar. Las metadata extra
// (level, rank, weaponId, skills) se pasan como props opcionales — el parent
// las extrae de `lastFight.brute` (player) o de `useBrute(opponentBruteId)`
// (oponente). Si están ausentes, se ocultan los elementos.

import { BruteAvatar } from '@/components/BruteAvatar';
import { HPBarV2 } from './HPBarV2';
import { CombatGlyph } from './CombatGlyph';
import { rankName } from '@/lib/profileFlavor';
import { getWeapon, getSkill } from 'core';
import type { FightFighter } from 'core';

interface FighterCardProps {
  fighter: FightFighter;
  hp: number;
  side: 'left' | 'right';
  level?: number;
  rank?: number;
  weaponId?: string | null;
  skills?: readonly string[];
}

export function FighterCard({
  fighter,
  hp,
  side,
  level,
  rank,
  weaponId,
  skills = [],
}: FighterCardProps) {
  const rankLabel = rank != null ? rankName(rank) : null;
  const weapon = weaponId ? getWeapon(weaponId) : null;
  const visibleSkills = skills.slice(0, 3);
  return (
    <div className={`fighter-card ${side}`}>
      <div className="fc-row">
        <div className="fc-bust">
          <BruteAvatar
            brute={{
              id: fighter.bruteId,
              gender: fighter.gender,
              body: fighter.body,
              bodyColors: fighter.bodyColors,
              lpc: fighter.lpc,
            }}
            size="sm"
          />
          {level != null && <span className="fc-lvl">{level}</span>}
        </div>
        <div className="fc-info">
          <div className="fc-top">
            <span className="fc-name">{fighter.name}</span>
            {rankLabel && <span className="fc-rank">{rankLabel}</span>}
          </div>
          <HPBarV2 value={hp} max={fighter.maxHp} side={side} />
          <div className="fc-skills">
            {weapon && (
              <span className="fc-weapon" title={weapon.name}>
                <CombatGlyph
                  kind={mapWeaponIcon(weapon.id)}
                  color={side === 'left' ? '#e6b450' : '#5fb04a'}
                />
              </span>
            )}
            {visibleSkills.length > 0 && weapon && <span className="fc-divider" />}
            {visibleSkills.map((sid) => {
              const s = getSkill(sid);
              return (
                <span key={sid} className="fc-skill" title={s?.name ?? sid}>
                  <CombatGlyph
                    kind={mapSkillIcon(sid)}
                    color={side === 'left' ? '#e6b450' : '#5fb04a'}
                  />
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Heurística snake_case → glyph kind para weapons. */
function mapWeaponIcon(id: string): string {
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

/** Heurística snake_case → glyph kind para skills. */
function mapSkillIcon(id: string): string {
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
