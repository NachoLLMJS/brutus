/**
 * Mapeo de IDs canónicos del catálogo (snake_case, ver core/src/data/) a paths
 * de assets importados desde LaBrute (camelCase + .png/.svg).
 *
 * Cuando un ID del core no tiene match exacto en LaBrute, se elige un fallback
 * razonable (semánticamente parecido o joke). El `<img onError>` cubre cualquier
 * mapping que falle en runtime.
 *
 * Ver ATTRIBUTION.md para créditos.
 */

const W = '/assets/weapons';
const S = '/assets/skills';
const P = '/assets/pets';

const WEAPON_FILE: Record<string, string> = {
  knife: 'knife.png',
  whip: 'whip.png',
  noodle_bowl: 'noodleBowl.png',
  sai: 'sai.png',
  hatchet: 'hatchet.png',
  axe: 'axe.png',
  scimitar: 'scimitar.png',
  mighty_hammer: 'mammothBone.png',
  halberd: 'halbard.png',
  lance: 'lance.png',
  trident: 'trident.png',
  nunchaku: 'flail.png',
  broadsword: 'broadsword.png',
  shuriken: 'shuriken.png',
  mug: 'mug.png',
  bo_staff: 'baton.png',
  katana: 'sword.png',
  flail: 'flail.png',
  morning_star: 'morningStar.png',
  dagger: 'knife.png',
  claymore: 'broadsword.png',
  rapier: 'sword.png',
  crossbow: 'piopio.png',
  chain_whip: 'whip.png',
  frying_pan: 'fryingPan.png',
  wrench: 'keyboard.png',
  fan: 'fan.png',
};

const SKILL_FILE: Record<string, string> = {
  herculean_strength: 'herculeanStrength.png',
  feline_agility: 'felineAgility.png',
  lightning_bolt: 'lightningBolt.png',
  vitality: 'vitality.png',
  immortal: 'immortality.png',
  untouchable: 'untouchable.png',
  vampirism: 'vampirism.png',
  regeneration: 'regeneration.png',
  hammer: 'hammer.png',
  fierce_brute: 'fierceBrute.png',
  tragic_potion: 'tragicPotion.png',
  cry_of_the_damned: 'cryOfTheDamned.png',
  shock: 'shock.png',
  thief: 'thief.png',
  monk: 'monk.png',
  weapons_master: 'weaponsMaster.png',
  martial_arts: 'martialArts.png',
  survival: 'survival.png',
  counter: 'counterAttack.png',
  iron_skin: 'toughenedSkin.png',
  swift_wind: 'haste.png',
  bomb: 'bomb.png',
  net: 'net.png',
  reckless: 'hostility.png',
  precision: 'sixthSense.png',
  berserk: 'fistsOfFury.png',
  acrobat: 'balletShoes.png',
  treachery: 'spy.png',
  stoic: 'resistant.png',
  tactician: 'tactician.png',
};

const PET_FILE: Record<string, string> = {
  wolf: 'dog.svg',
  bear: 'bear.svg',
  panthers: 'panther.svg',
  mastiff: 'dog.svg',
};

export const FALLBACK_WEAPON = `${W}/knife.png`;
export const FALLBACK_SKILL = `${S}/herculeanStrength.png`;
export const FALLBACK_PET = `${P}/dog.svg`;

export function weaponAsset(id: string): string {
  const file = WEAPON_FILE[id];
  return file ? `${W}/${file}` : FALLBACK_WEAPON;
}

export function skillAsset(id: string): string {
  const file = SKILL_FILE[id];
  return file ? `${S}/${file}` : FALLBACK_SKILL;
}

export function petAsset(id: string): string {
  const file = PET_FILE[id];
  return file ? `${P}/${file}` : FALLBACK_PET;
}

export type StatKey = 'hp' | 'strength' | 'agility' | 'speed';

export const STAT_ICONS: Record<StatKey, string> = {
  hp: '/assets/stats/hp.webp',
  strength: '/assets/stats/strength.webp',
  agility: '/assets/stats/agility.webp',
  speed: '/assets/stats/speed.webp',
};
