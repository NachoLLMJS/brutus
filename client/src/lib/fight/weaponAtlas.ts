// Atlas compartido de armas (thrown-weapons.png/json) usado tanto para
// proyectiles rectos (`thrownWeapon.ts`) como para drops con física
// (`droppedWeapon.ts`).
//
// Carga lazy: la primera invocación a `loadWeaponAtlas` descarga y parsea,
// las siguientes reutilizan el cache.

import * as PIXI from 'pixi.js';

interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  anchor: { x: number; y: number };
}

interface AtlasJson {
  frames: Record<string, AtlasFrame>;
  meta: { image: string; size: { w: number; h: number }; scale: string };
}

let atlasPromise: Promise<PIXI.Spritesheet | null> | null = null;

export async function loadWeaponAtlas(): Promise<PIXI.Spritesheet | null> {
  if (atlasPromise) return atlasPromise;
  atlasPromise = (async () => {
    try {
      const jsonRes = await fetch('/images/game/thrown-weapons.json');
      const json = (await jsonRes.json()) as AtlasJson;
      const baseTexture = await new Promise<PIXI.BaseTexture>((resolve, reject) => {
        const tex = PIXI.BaseTexture.from('/images/game/thrown-weapons.png');
        if (tex.valid) {
          resolve(tex);
        } else {
          tex.on('loaded', () => resolve(tex));
          tex.on('error', reject);
        }
      });
      const sheet = new PIXI.Spritesheet(baseTexture, json as unknown as PIXI.ISpritesheetData);
      await new Promise<void>((resolve) => sheet.parse(() => resolve()));
      return sheet;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load thrown-weapons atlas', err);
      return null;
    }
  })();
  return atlasPromise;
}

/**
 * Mapeo de los ids snake_case de Brutus to frame del atlas thrown-weapons
 * (que usa camelCase). Mismo enfoque que `client/src/lib/assets.ts`.
 */
export const WEAPON_FRAME_NAME: Record<string, string> = {
  knife: 'knife.png',
  broadsword: 'broadsword.png',
  lance: 'lance.png',
  bo_staff: 'baton.png',
  trident: 'trident.png',
  hatchet: 'hatchet.png',
  scimitar: 'scimitar.png',
  axe: 'axe.png',
  katana: 'sword.png',
  fan: 'fan.png',
  shuriken: 'shuriken.png',
  morning_star: 'morningStar.png',
  mighty_hammer: 'mammothBone.png',
  nunchaku: 'flail.png',
  flail: 'flail.png',
  whip: 'whip.png',
  sai: 'sai.png',
  mug: 'mug.png',
  frying_pan: 'fryingPan.png',
  crossbow: 'piopio.png',
  halberd: 'halbard.png',
  wrench: 'keyboard.png',
  noodle_bowl: 'noodleBowl.png',
  dagger: 'knife.png',
  claymore: 'broadsword.png',
  rapier: 'sword.png',
  chain_whip: 'whip.png',
};

export async function getWeaponTexture(weaponId: string): Promise<PIXI.Texture | null> {
  const sheet = await loadWeaponAtlas();
  const frameName = WEAPON_FRAME_NAME[weaponId];
  if (!sheet || !frameName) return null;
  return sheet.textures[frameName] ?? null;
}
