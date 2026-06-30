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
  'Iniciado', 'Mercenario', 'Soldado', 'Cazador',
  'Hechicero', 'Gladiador', 'Verdugo', 'Carnicero',
  'Caballero Negro', 'Señor de la Sangre',
];

const RUMORS: readonly string[] = [
  'Dicen que cuelga los cráneos de sus víctimas en el cinturón. Lleva siete.',
  'Pelea descalzo. Las losas de la fosa lo recuerdan.',
  'Doce Vault Brawlers han entrado a la fosa contra él. Doce no salieron caminando.',
  'Su armadura nunca se quita. Algunos dicen que ya no puede.',
  'Le hablan los muertos. A veces les hace caso.',
  'Vino del desierto a buscar oro. Encontró sangre. Se quedó.',
  'Sus flechas están marcadas con runas. Las recoge después de cada pelea.',
  'Despoja a los caídos. Su carro huele a ruina.',
  'Reza antes de cada combate. No se sabe a quién.',
  'No habla. Nadie lo ha oído jamás. Solo el filo del acero.',
  'Le pagaron en oro para que no peleara. Vino igual.',
  'Su sombra llega antes que él. La fosa la conoce.',
  'Una vez perdió un ojo. Dicen que aún lo busca.',
  'Bebe de los caídos. Solo agua, dice. Pero está rojiza.',
  'Su nombre aparece tres veces en el libro de los condenados.',
  'No tiene maestro. Aprendió a matar de la propia fosa.',
];

const LAST_FIGHT_LABELS: readonly string[] = [
  'Hace 2m', 'Hace 14m', 'Hace 22m', 'Hace 41m',
  'Hace 1h', 'Hace 3h', 'Hace 5h', 'Hace 8h',
  'Ayer', 'Hace 2 días',
];

const WEAPON_GLYPH_MAP: Record<string, { name: string; icon: WeaponIcon }> = {
  knife:        { name: 'Cuchillo de Hueso', icon: 'dagger' },
  dagger:       { name: 'Daga Maldita', icon: 'dagger' },
  sai:          { name: 'Sai', icon: 'dagger' },
  axe:          { name: 'Hacha del Verdugo', icon: 'axe' },
  hatchet:      { name: 'Hachuela', icon: 'axe' },
  scimitar:     { name: 'Cimitarra Curva', icon: 'sword' },
  broadsword:   { name: 'Espada Ancha', icon: 'sword' },
  katana:       { name: 'Katana Negra', icon: 'sword' },
  claymore:     { name: 'Mandoble', icon: 'sword' },
  rapier:       { name: 'Estoque', icon: 'sword' },
  lance:        { name: 'Lanza', icon: 'spear' },
  halberd:      { name: 'Alabarda', icon: 'spear' },
  trident:      { name: 'Tridente', icon: 'spear' },
  bo_staff:     { name: 'Bastón Bo', icon: 'mace' },
  morning_star: { name: 'Lucero del Alba', icon: 'flail' },
  flail:        { name: 'Mangual', icon: 'flail' },
  nunchaku:     { name: 'Nunchaku', icon: 'flail' },
  chain_whip:   { name: 'Látigo de Cadena', icon: 'flail' },
  whip:         { name: 'Látigo', icon: 'flail' },
  mighty_hammer:{ name: 'Martillo Poderoso', icon: 'hammer' },
  mug:          { name: 'Jarra Roñosa', icon: 'mace' },
  frying_pan:   { name: 'Sartén', icon: 'mace' },
  noodle_bowl:  { name: 'Cuenco de Fideos', icon: 'mace' },
  wrench:       { name: 'Llave Inglesa', icon: 'mace' },
  fan:          { name: 'Abanico', icon: 'dagger' },
  shuriken:     { name: 'Shuriken', icon: 'dagger' },
  crossbow:     { name: 'Ballesta', icon: 'bow' },
};

const BEAST_GLYPH_MAP: Record<string, { name: string; icon: BeastIcon }> = {
  dog:     { name: 'Lobo Garmr', icon: 'wolf' },
  wolf:    { name: 'Lobo', icon: 'wolf' },
  bear:    { name: 'Oso Krogh', icon: 'bear' },
  panther: { name: 'Pantera Sombra', icon: 'panther' },
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
  if (r < 0.55) return { status: 'online', label: 'En la fosa' };
  if (r < 0.85) return { status: 'recent', label: 'Hace poco' };
  return { status: 'cold', label: 'Inactivo' };
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
    : { name: 'Puños', icon: 'none' as WeaponIcon };

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
