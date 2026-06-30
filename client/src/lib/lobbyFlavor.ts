// Genera flavor data determinístico para los oponentes del lobby (rumores,
// streak, último combate, status, glyphs de arma/bestia, kind visual,
// rankTier). Todo seedeado por `brute.id` así que cada bruto tiene siempre
// la misma "personalidad" sin que el server tenga que persistirla.
//
// Cuando el server eventualmente devuelva estos campos reales, esta capa
// se reemplaza por el dato de la API directamente.

import type { Brute } from 'core';

export type FlavorKind =
  | 'vorgath'
  | 'bone'
  | 'plague'
  | 'crimson'
  | 'iron'
  | 'witch'
  | 'sand'
  | 'rune';

export type RankTier = 'bronze' | 'silver' | 'gold' | 'blood';

export type FlavorStatus = 'online' | 'recent' | 'cold';

export type WeaponIcon =
  | 'axe' | 'sword' | 'mace' | 'dagger' | 'bow' | 'spear' | 'flail'
  | 'scythe' | 'hammer' | 'none';

export type BeastIcon = 'wolf' | 'bear' | 'panther' | 'rat' | 'none';

export interface OpponentFlavor {
  kind: FlavorKind;
  rankTier: RankTier;
  rankName: string;
  status: FlavorStatus;
  statusLabel: string;
  weapon: { name: string; icon: WeaponIcon };
  beast: { name: string; icon: BeastIcon } | null;
  streak: number; // positivo = racha de victorias, negativo = derrotas
  lastFight: string;
  rumor: string;
  /** Color de acento del oponente (para glyphs y bordes). */
  color: string;
}

/* ------------------------ PRNG seedeado ------------------------ */
function hashId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

/* ------------------------ Catálogos ------------------------ */
const KINDS: FlavorKind[] = ['vorgath', 'bone', 'plague', 'crimson', 'iron', 'witch', 'sand', 'rune'];

const KIND_COLORS: Record<FlavorKind, string> = {
  vorgath: '#c41a1a',
  bone:    '#e6b450',
  plague:  '#a0e08a',
  crimson: '#ff5a3c',
  iron:    '#c0c0d0',
  witch:   '#c898e0',
  sand:    '#ffd060',
  rune:    '#80b0ff',
};

const RANK_NAMES: readonly string[] = [
  'Initiate', 'Mercenary', 'Soldier', 'Hunter',
  'Sorcerer', 'Gladiator', 'Executioner', 'Butcher',
  'Black Knight', 'Blood Lord',
];

const RUMORS: readonly string[] = [
  "They say he hangs his victims' skulls from his belt. He carries seven.",
  'Fights barefoot. The pit stones remember him.',
  'Twelve Vault Brawlers entered the pit against him. Twelve did not walk out.',
  'His armor never comes off. Some say it no longer can.',
  'The dead speak to him. Sometimes he listens.',
  'He came from the desert seeking gold. He found blood. He stayed.',
  'His arrows are marked with runes. He collects them after every fight.',
  'He strips the fallen. His cart smells of ruin.',
  'He prays before every fight. No one knows to whom.',
  'He does not speak. No one has ever heard him. Only the edge of steel.',
  'They paid him in gold not to fight. He came anyway.',
  'His shadow arrives before he does. The pit knows it.',
  'He once lost an eye. They say he still looks for it.',
  'He drinks from the fallen. Just water, he says. But it is reddish.',
  'His name appears three times in the book of the damned.',
  'He has no master. He learned to kill from the pit itself.',
];

const LAST_FIGHT_LABELS: readonly string[] = [
  '2m ago', '14m ago', '22m ago', '41m ago',
  '1h ago', '3h ago', '5h ago', '8h ago',
  'Yesterday', '2 days ago',
];

const WEAPON_GLYPH_MAP: Record<string, { name: string; icon: WeaponIcon }> = {
  knife:        { name: 'Bone Knife', icon: 'dagger' },
  dagger:       { name: 'Cursed Dagger', icon: 'dagger' },
  sai:          { name: 'Sai', icon: 'dagger' },
  axe:          { name: 'Executioner Axe', icon: 'axe' },
  hatchet:      { name: 'Hatchet', icon: 'axe' },
  scimitar:     { name: 'Curved Scimitar', icon: 'sword' },
  broadsword:   { name: 'Broadsword', icon: 'sword' },
  katana:       { name: 'Black Katana', icon: 'sword' },
  claymore:     { name: 'Claymore', icon: 'sword' },
  rapier:       { name: 'Rapier', icon: 'sword' },
  lance:        { name: 'Spear', icon: 'spear' },
  halberd:      { name: 'Halberd', icon: 'spear' },
  trident:      { name: 'Trident', icon: 'spear' },
  bo_staff:     { name: 'Bo Staff', icon: 'mace' },
  morning_star: { name: 'Morning Star', icon: 'flail' },
  flail:        { name: 'Flail', icon: 'flail' },
  nunchaku:     { name: 'Nunchaku', icon: 'flail' },
  chain_whip:   { name: 'Chain Whip', icon: 'flail' },
  whip:         { name: 'Whip', icon: 'flail' },
  mighty_hammer:{ name: 'Mighty Hammer', icon: 'hammer' },
  mug:          { name: 'Rusty Mug', icon: 'mace' },
  frying_pan:   { name: 'Frying Pan', icon: 'mace' },
  noodle_bowl:  { name: 'Noodle Bowl', icon: 'mace' },
  wrench:       { name: 'Wrench', icon: 'mace' },
  fan:          { name: 'Fan', icon: 'dagger' },
  shuriken:     { name: 'Shuriken', icon: 'dagger' },
  crossbow:     { name: 'Crossbow', icon: 'bow' },
};

const BEAST_GLYPH_MAP: Record<string, { name: string; icon: BeastIcon }> = {
  dog:     { name: 'Garmr Wolf', icon: 'wolf' },
  wolf:    { name: 'Wolf', icon: 'wolf' },
  bear:    { name: 'Krogh Bear', icon: 'bear' },
  panther: { name: 'Shadow Panther', icon: 'panther' },
};

/* ------------------------ Mappings ------------------------ */
function rankToTier(rank: number): RankTier {
  if (rank >= 7) return 'blood';
  if (rank >= 5) return 'gold';
  if (rank >= 3) return 'silver';
  return 'bronze';
}

function rankToName(rank: number): string {
  const idx = Math.min(RANK_NAMES.length - 1, Math.max(0, rank));
  return RANK_NAMES[idx]!;
}

function deriveStreak(rng: () => number, victories: number, defeats: number): number {
  // Si hay datos reales: usar la diferencia clamped.
  const diff = victories - defeats;
  if (Math.abs(diff) >= 3) {
    return Math.sign(diff) * Math.min(12, Math.abs(diff));
  }
  // Fallback determinístico: -3..+9
  return Math.floor(rng() * 13) - 3;
}

function deriveStatus(rng: () => number): { status: FlavorStatus; label: string } {
  const r = rng();
  if (r < 0.55) return { status: 'online', label: 'In the pit' };
  if (r < 0.85) return { status: 'recent', label: 'Recently' };
  return { status: 'cold', label: 'Inactive' };
}

/* ------------------------ Public API ------------------------ */
export function flavorFor(brute: Brute): OpponentFlavor {
  const rng = mulberry32(hashId(brute.id));
  const kind = pick(rng, KINDS);
  const rankTier = rankToTier(brute.rank);
  const rankName = rankToName(brute.rank);

  const weaponId = brute.weapons[0];
  const weapon = weaponId && WEAPON_GLYPH_MAP[weaponId]
    ? WEAPON_GLYPH_MAP[weaponId]!
    : { name: 'Fists', icon: 'none' as WeaponIcon };

  const petId = brute.pets[0];
  const beast = petId && BEAST_GLYPH_MAP[petId] ? BEAST_GLYPH_MAP[petId]! : null;

  const streak = deriveStreak(rng, brute.victories, brute.defeats);
  const lastFight = pick(rng, LAST_FIGHT_LABELS);
  const rumor = pick(rng, RUMORS);
  const { status, label: statusLabel } = deriveStatus(rng);

  return {
    kind,
    rankTier,
    rankName,
    status,
    statusLabel,
    weapon,
    beast,
    streak,
    lastFight,
    rumor,
    color: KIND_COLORS[kind],
  };
}
