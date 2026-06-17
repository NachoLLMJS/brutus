// Sound manager para el FightStage.
// Wrapper sobre @pixi/sound que carga SFX bajo demanda y los reproduce con
// volumen global y mute.
//
// Los assets vienen de LaBrute (`public/sfx/`). El uso es siempre por
// "key" semántico: `playSfx('hit')`, `playSfx('evade')`, etc. — el mapeo
// real al archivo está aquí, así si después reskinneamos los SFX a fantasía
// oscura cambiamos solo este archivo.

import { sound } from '@pixi/sound';

const BASE = '/sfx';

interface SfxEntry {
  url: string;
  /** Volumen relativo (0..1). Por defecto 0.6. */
  volume?: number;
}

/**
 * Catálogo de SFX disponibles. La key es semántica; el archivo es el de
 * LaBrute. Las variantes por arma siguen el patrón `hit_<grupo>_<n>`.
 */
const SFX: Record<string, SfxEntry> = {
  // Combate básico (legacy, mantenidos por retrocompat).
  hit:        { url: `${BASE}/hitting/fist1.wav`, volume: 0.6 },
  hit_blade:  { url: `${BASE}/hitting/sharp1.wav`, volume: 0.55 },
  hit_blunt:  { url: `${BASE}/hitting/blunt1.wav`, volume: 0.6 },

  // Variantes randomizadas — fist (puños).
  hit_fist_1: { url: `${BASE}/hitting/fist1.wav`, volume: 0.6 },
  hit_fist_2: { url: `${BASE}/hitting/fist2.wav`, volume: 0.6 },
  hit_fist_3: { url: `${BASE}/hitting/fist3.wav`, volume: 0.6 },

  // Variantes — sharp (filos genéricos).
  hit_sharp_1: { url: `${BASE}/hitting/sharp1.wav`, volume: 0.55 },
  hit_sharp_2: { url: `${BASE}/hitting/sharp2.wav`, volume: 0.55 },
  hit_sharp_3: { url: `${BASE}/hitting/sharp3.wav`, volume: 0.55 },
  hit_sharp_4: { url: `${BASE}/hitting/sharp4.wav`, volume: 0.55 },
  hit_sharp_5: { url: `${BASE}/hitting/sharp5.wav`, volume: 0.55 },
  hit_sharp_6: { url: `${BASE}/hitting/sharp6.wav`, volume: 0.55 },
  hit_sharp_7: { url: `${BASE}/hitting/sharp7.wav`, volume: 0.55 },
  hit_sharp_8: { url: `${BASE}/hitting/sharp8.wav`, volume: 0.55 },

  // Variantes — blunt (contundentes genéricos).
  hit_blunt_1: { url: `${BASE}/hitting/blunt1.wav`, volume: 0.6 },
  hit_blunt_2: { url: `${BASE}/hitting/blunt2.wav`, volume: 0.6 },
  hit_blunt_3: { url: `${BASE}/hitting/blunt3.wav`, volume: 0.6 },
  hit_blunt_4: { url: `${BASE}/hitting/blunt4.wav`, volume: 0.6 },
  hit_blunt_5: { url: `${BASE}/hitting/blunt5.wav`, volume: 0.6 },
  hit_blunt_6: { url: `${BASE}/hitting/blunt6.wav`, volume: 0.6 },
  hit_blunt_7: { url: `${BASE}/hitting/blunt7.wav`, volume: 0.6 },
  hit_blunt_8: { url: `${BASE}/hitting/blunt8.wav`, volume: 0.6 },

  // Variantes específicas por arma.
  hit_knife_1:       { url: `${BASE}/hitting/knife1.wav`, volume: 0.55 },
  hit_knife_2:       { url: `${BASE}/hitting/knife2.wav`, volume: 0.55 },
  hit_axe_1:         { url: `${BASE}/hitting/axe1.mp3`, volume: 0.6 },
  hit_axe_2:         { url: `${BASE}/hitting/axe2.mp3`, volume: 0.6 },
  hit_hatchet_1:     { url: `${BASE}/hitting/hatchet1.wav`, volume: 0.6 },
  hit_hatchet_2:     { url: `${BASE}/hitting/hatchet2.wav`, volume: 0.6 },
  hit_scimitar_1:    { url: `${BASE}/hitting/scimitar1.wav`, volume: 0.55 },
  hit_scimitar_2:    { url: `${BASE}/hitting/scimitar2.wav`, volume: 0.55 },
  hit_broadsword_1:  { url: `${BASE}/hitting/broadsword1.wav`, volume: 0.6 },
  hit_broadsword_2:  { url: `${BASE}/hitting/broadsword2.wav`, volume: 0.6 },
  hit_sword:         { url: `${BASE}/hitting/sword.wav`, volume: 0.6 },
  hit_lance_1:       { url: `${BASE}/hitting/lance1.wav`, volume: 0.55 },
  hit_lance_2:       { url: `${BASE}/hitting/lance2.wav`, volume: 0.55 },
  hit_baton_1:       { url: `${BASE}/hitting/baton1.wav`, volume: 0.6 },
  hit_baton_2:       { url: `${BASE}/hitting/baton2.wav`, volume: 0.6 },
  hit_baton_3:       { url: `${BASE}/hitting/baton3.wav`, volume: 0.6 },
  hit_fan_1:         { url: `${BASE}/hitting/fan1.wav`, volume: 0.5 },
  hit_fan_2:         { url: `${BASE}/hitting/fan2.wav`, volume: 0.5 },
  hit_fryingpan_1:   { url: `${BASE}/hitting/fryingPan1.wav`, volume: 0.65 },
  hit_fryingpan_2:   { url: `${BASE}/hitting/fryingPan2.mp3`, volume: 0.65 },
  hit_noodlebowl_1:  { url: `${BASE}/hitting/noodleBowl1.mp3`, volume: 0.6 },
  hit_noodlebowl_2:  { url: `${BASE}/hitting/noodleBowl2.mp3`, volume: 0.6 },
  hit_trombone_1:    { url: `${BASE}/hitting/trombone1.wav`, volume: 0.55 },
  hit_trombone_2:    { url: `${BASE}/hitting/trombone2.wav`, volume: 0.55 },
  hit_trombone_3:    { url: `${BASE}/hitting/trombone3.wav`, volume: 0.55 },
  hit_trombone_4:    { url: `${BASE}/hitting/trombone4.wav`, volume: 0.55 },
  hit_shuriken:      { url: `${BASE}/hitting/shuriken.mp3`, volume: 0.5 },
  hit_whip:          { url: `${BASE}/hitting/whip.mp3`, volume: 0.55 },
  hit_leek:          { url: `${BASE}/hitting/leek.mp3`, volume: 0.55 },
  hit_mammothbone:   { url: `${BASE}/hitting/mammothBone.mp3`, volume: 0.65 },
  hit_keyboard_1:    { url: `${BASE}/hitting/keyboard1.wav`, volume: 0.6 },
  hit_keyboard_2:    { url: `${BASE}/hitting/keyboard2.wav`, volume: 0.6 },
  hit_piopio:        { url: `${BASE}/hitting/piopio.wav`, volume: 0.55 },
  hit_racquet:       { url: `${BASE}/hitting/racquet.mp3`, volume: 0.55 },

  // Pets.
  hit_bear:    { url: `${BASE}/hit/bear.wav`, volume: 0.6 },
  hit_dog:     { url: `${BASE}/hit/dog.wav`, volume: 0.55 },
  hit_panther: { url: `${BASE}/hit/panther.wav`, volume: 0.55 },

  // Defensa / esquiva / poison.
  evade:    { url: `${BASE}/hit/evade.mp3`, volume: 0.6 },
  block:    { url: `${BASE}/hit/block1.wav`, volume: 0.55 },
  block_1:  { url: `${BASE}/hit/block1.wav`, volume: 0.55 },
  block_2:  { url: `${BASE}/hit/block2.wav`, volume: 0.55 },
  block_3:  { url: `${BASE}/hit/block3.wav`, volume: 0.55 },
  block_4:  { url: `${BASE}/hit/block4.wav`, volume: 0.55 },
  poison:   { url: `${BASE}/hit/poison.mp3`, volume: 0.6 },

  // Movimiento / acciones
  arrive:     { url: `${BASE}/arrive.mp3`, volume: 0.5 },
  equip:      { url: `${BASE}/equip.mp3`, volume: 0.55 },

  // Skills (todas las que tiene LaBrute)
  bomb:           { url: `${BASE}/skills/bomb.mp3`, volume: 0.7 },
  chaining:       { url: `${BASE}/skills/chaining.mp3`, volume: 0.55 },
  cry:            { url: `${BASE}/skills/cryOfTheDamned.mp3`, volume: 0.55 },
  fierce:         { url: `${BASE}/skills/fierceBrute.wav`, volume: 0.6 },
  flashFlood:     { url: `${BASE}/skills/flashFlood.mp3`, volume: 0.7 },
  hammer:         { url: `${BASE}/skills/hammer.wav`, volume: 0.7 },
  haste:          { url: `${BASE}/skills/haste.mp3`, volume: 0.6 },
  hypnosis:       { url: `${BASE}/skills/hypnosis.mp3`, volume: 0.6 },
  net:            { url: `${BASE}/skills/net.wav`, volume: 0.55 },
  saboteur:       { url: `${BASE}/skills/saboteur.mp3`, volume: 0.55 },
  spy:            { url: `${BASE}/skills/spy.mp3`, volume: 0.55 },
  tamer:          { url: `${BASE}/skills/tamer1.mp3`, volume: 0.55 },

  // Ambient
  bg:         { url: `${BASE}/background.mp3`, volume: 0.25 },
  win:        { url: `${BASE}/train.wav`, volume: 0.55 },
  lose:       { url: `${BASE}/loose.wav`, volume: 0.55 },
};

export type SfxKey = keyof typeof SFX;

let initialized = false;
let muted = false;
let masterVolume = 1.0;

/** Carga lazy: a la primera llamada a `playSfx`, registramos los aliases. */
function ensureLoaded() {
  if (initialized) return;
  initialized = true;
  for (const [key, entry] of Object.entries(SFX)) {
    try {
      sound.add(key, {
        url: entry.url,
        preload: false,
      });
    } catch {
      // Si add() ya fue llamado, ignoramos.
    }
  }
}

export function playSfx(key: SfxKey): void {
  ensureLoaded();
  if (muted) return;
  const entry = SFX[key];
  if (!entry) return;
  try {
    sound.play(key, {
      volume: (entry.volume ?? 0.6) * masterVolume,
      singleInstance: false,
    });
  } catch {
    // Asset no encontrado o error de carga: silencioso.
  }
}

/**
 * Mapea el id de un skill (snake_case del catálogo core) al SFX más cercano
 * de LaBrute. Si no hay match exacto, fallback genérico.
 */
const SKILL_SFX_MAP: Record<string, SfxKey> = {
  hammer: 'hammer',
  bomb: 'bomb',
  net: 'net',
  cry_of_the_damned: 'cry',
  fierce_brute: 'fierce',
  swift_wind: 'haste',
  // Hypnose / cluster mapping
  // Si agregamos skills hypnose, se mapea aquí.
};

export function playSkillSfx(skillId: string): void {
  const key = SKILL_SFX_MAP[skillId];
  if (key) playSfx(key);
}

// ───────────────────────── Variantes randomizadas ─────────────────────────

const FIST_VARIANTS: SfxKey[] = ['hit_fist_1', 'hit_fist_2', 'hit_fist_3'];
const SHARP_VARIANTS: SfxKey[] = [
  'hit_sharp_1', 'hit_sharp_2', 'hit_sharp_3', 'hit_sharp_4',
  'hit_sharp_5', 'hit_sharp_6', 'hit_sharp_7', 'hit_sharp_8',
];
const BLUNT_VARIANTS: SfxKey[] = [
  'hit_blunt_1', 'hit_blunt_2', 'hit_blunt_3', 'hit_blunt_4',
  'hit_blunt_5', 'hit_blunt_6', 'hit_blunt_7', 'hit_blunt_8',
];
const BLOCK_VARIANTS: SfxKey[] = ['block_1', 'block_2', 'block_3', 'block_4'];

/**
 * Mapeo arma → variantes específicas. Se combina con sharp/blunt según el
 * tipo del arma (pattern de LaBrute).
 */
const WEAPON_SPECIFIC_SFX: Record<string, SfxKey[]> = {
  knife:        ['hit_knife_1', 'hit_knife_2'],
  dagger:       ['hit_knife_1', 'hit_knife_2'],
  axe:          ['hit_axe_1', 'hit_axe_2'],
  hatchet:      ['hit_hatchet_1', 'hit_hatchet_2'],
  scimitar:     ['hit_scimitar_1', 'hit_scimitar_2'],
  broadsword:   ['hit_broadsword_1', 'hit_broadsword_2'],
  katana:       ['hit_sword'],
  claymore:     ['hit_broadsword_1', 'hit_broadsword_2'],
  rapier:       ['hit_sword'],
  lance:        ['hit_lance_1', 'hit_lance_2'],
  halberd:      ['hit_lance_1', 'hit_lance_2'],
  trident:      ['hit_lance_1', 'hit_lance_2'],
  bo_staff:     ['hit_baton_1', 'hit_baton_2', 'hit_baton_3'],
  morning_star: ['hit_baton_1', 'hit_baton_2', 'hit_baton_3'],
  flail:        ['hit_baton_1', 'hit_baton_2', 'hit_baton_3'],
  nunchaku:     ['hit_baton_1', 'hit_baton_2', 'hit_baton_3'],
  fan:          ['hit_fan_1', 'hit_fan_2'],
  frying_pan:   ['hit_fryingpan_1', 'hit_fryingpan_2'],
  noodle_bowl:  ['hit_noodlebowl_1', 'hit_noodlebowl_2'],
  shuriken:     ['hit_shuriken'],
  whip:         ['hit_whip'],
  chain_whip:   ['hit_whip'],
  mighty_hammer:['hit_mammothbone'],
  wrench:       ['hit_keyboard_1', 'hit_keyboard_2'],
  crossbow:     ['hit_piopio'],
  mug:          ['hit_blunt_1', 'hit_blunt_2'],
  sai:          ['hit_knife_1', 'hit_knife_2'],
};

/** Armas tipo filo → se complementan con sharp1..8. */
const SHARP_WEAPONS = new Set<string>([
  'knife', 'dagger', 'axe', 'hatchet', 'scimitar', 'broadsword',
  'katana', 'claymore', 'rapier', 'sai', 'shuriken', 'fan',
  'lance', 'halberd', 'trident',
]);

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/**
 * Devuelve la SfxKey a reproducir para un golpe con `weaponId`. Si no hay
 * arma → puños random. Si hay arma → array combinado de variantes
 * específicas + variantes genéricas por tipo (sharp o blunt).
 */
export function pickHitVariant(weaponId?: string): SfxKey {
  if (!weaponId) return pickRandom(FIST_VARIANTS);
  const specific = WEAPON_SPECIFIC_SFX[weaponId] ?? [];
  const typeVariants = SHARP_WEAPONS.has(weaponId) ? SHARP_VARIANTS : BLUNT_VARIANTS;
  const all: SfxKey[] = [...specific, ...typeVariants];
  return pickRandom(all);
}

/** Reproduce un SFX de golpe con randomización. */
export function playWeaponHit(weaponId?: string): void {
  playSfx(pickHitVariant(weaponId));
}

/** Reproduce un block random (1-4). */
export function playBlockSfx(): void {
  playSfx(pickRandom(BLOCK_VARIANTS));
}

/**
 * Reproduce el SFX de impacto de un pet según su modelo. Para 'panther' se
 * usa `hit_panther`; para 'wolf' u otros desconocidos, fallback a hit_dog.
 */
export function playPetHit(model: string): void {
  switch (model) {
    case 'bear':
      playSfx('hit_bear');
      return;
    case 'panther':
      playSfx('hit_panther');
      return;
    case 'dog':
    case 'wolf':
    default:
      playSfx('hit_dog');
  }
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

export function setVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
}

/**
 * Música de fondo en loop. Se llama al iniciar el combate y `stopBgm` al
 * destruir el stage. Si ya hay otro BGM sonando, lo detiene primero.
 */
let bgmInstance: { stop?: () => void } | null = null;

export function playBgm(key: SfxKey = 'bg'): void {
  ensureLoaded();
  if (muted) return;
  stopBgm();
  const entry = SFX[key];
  if (!entry) return;
  try {
    const result = sound.play(key, {
      volume: (entry.volume ?? 0.25) * masterVolume,
      loop: true,
      singleInstance: true,
    });
    // sound.play retorna IMediaInstance | Promise<IMediaInstance> — guardamos
    // la referencia para poder detenerla. Si es Promise (lazy load), la
    // resolvemos y guardamos.
    if (result && typeof (result as { stop?: () => void }).stop === 'function') {
      bgmInstance = result as { stop?: () => void };
    } else if (result && typeof (result as Promise<unknown>).then === 'function') {
      void (result as Promise<{ stop?: () => void }>).then((inst) => {
        bgmInstance = inst;
      });
    }
  } catch {
    // silencioso
  }
}

export function stopBgm(): void {
  if (bgmInstance) {
    try {
      bgmInstance.stop?.();
    } catch {
      // ignorar
    }
    bgmInstance = null;
  }
  // Por si quedó algún track de fondo sin track de instancia.
  try {
    sound.stop('bg');
  } catch {
    // ignorar
  }
}
