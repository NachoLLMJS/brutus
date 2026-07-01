import * as PIXI from 'pixi.js';
import type { LpcAppearance } from 'core';

const FRAME = 64;
const ROW_BY_FACING: Record<'down' | 'left' | 'right' | 'up', number> = {
  down: 2,
  left: 1,
  right: 3,
  up: 0,
};
const FIGHT_SCALE = 2.25;

type LpcAction = 'combat_idle' | 'walk' | 'run' | 'slash' | 'halfslash' | 'thrust' | 'hurt' | 'death' | 'block' | 'evade' | 'win';
type PaletteMaterial = 'metal' | 'cloth';
type Layer = { src: string; tint?: string; palette?: PaletteMaterial; color?: string };

const LPC_ACTION_FRAMES: Record<LpcAction, number> = {
  combat_idle: 2,
  walk: 9,
  run: 9,
  slash: 6,
  halfslash: 6,
  thrust: 8,
  hurt: 6,
  death: 6,
  block: 6,
  evade: 6,
  win: 2,
};

const OFFICIAL_PALETTES = {
  metal: {
    source: ['#1D131E', '#2E2533', '#4D4A5D', '#726B7E', '#867E7F', '#C4B59F', '#FFFFFF'],
    ceramic: ['#181009', '#2B1C1D', '#32251A', '#594435', '#7D604D', '#BA9069', '#FBE3B0'],
    brass: ['#1A1213', '#2E2533', '#61482C', '#836332', '#AF8A35', '#FDD082', '#FDF5CC'],
    copper: ['#691503', '#4F2313', '#7B2008', '#973C23', '#9D5427', '#EC855C', '#FFC95A'],
    bronze: ['#4F2313', '#573726', '#6D4A00', '#966600', '#BF8200', '#E7A820', '#FBE3B0'],
    iron: ['#000000', '#1D131E', '#1B192B', '#29253A', '#343043', '#484152', '#726B7E'],
    steel: ['#1D131E', '#2E2533', '#4D4A5D', '#726B7E', '#867E7F', '#C4B59F', '#FFFFFF'],
    silver: ['#1D131E', '#2E2533', '#31313E', '#4A5057', '#818B8B', '#D6E1D3', '#FFFFFF'],
    gold: ['#2E2533', '#4F2313', '#6D4A00', '#966600', '#DC6F35', '#FFC95A', '#FFFF61'],
  },
  cloth: {
    source: ['#1d131e9C', '#1d131e', '#4D4A5D', '#958080', '#C4B59F', '#E5E6C7', '#FFFFFF'],
    black: ['#0000009C', '#000000', '#161616', '#2E2533', '#4D4A5D', '#726B7E', '#867E7F'],
    yellow: ['#3017239C', '#301723', '#5F2F25', '#BA5B23', '#D99431', '#F3C03F', '#FFE360'],
    pink: ['#1d131e9C', '#1d131e', '#54242E', '#6C3536', '#AE424A', '#C36072', '#E08080'],
    purple: ['#1807169C', '#180716', '#13112D', '#261044', '#411357', '#621E78', '#813089'],
    silver: ['#2818209C', '#281820', '#4D4A5D', '#958080', '#C4B59F', '#E5E6C7', '#FFFFFF'],
  },
} as const;

const ARMOR_COLOR_TO_OFFICIAL: Record<string, keyof typeof OFFICIAL_PALETTES.metal | keyof typeof OFFICIAL_PALETTES.cloth> = {
  steel: 'steel',
  yellow: 'yellow',
  iron: 'iron',
  bronze: 'bronze',
  copper: 'copper',
  pink: 'pink',
  purple: 'purple',
  silver: 'silver',
  black: 'black',
};

export interface LpcFightOverlay extends PIXI.Container {
  setLpcAnimation: (name: string) => void;
  playLpcAnimation: (name: string, durationMs?: number) => Promise<void>;
  destroyLpcOverlay: () => void;
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function value<T extends string>(raw: string | undefined, allowed: readonly T[], fallback: T): T {
  return raw && allowed.includes(raw as T) ? raw as T : fallback;
}

function actionFor(animation: string): LpcAction {
  if (animation === 'run' || animation === 'arrive') return 'run';
  if (animation === 'slash' || animation === 'whip' || animation === 'trash') return 'slash';
  if (animation === 'fist' || animation === 'attack') return 'halfslash';
  if (animation === 'estoc') return 'thrust';
  if (animation.startsWith('hit') || animation === 'hit') return 'hurt';
  if (animation === 'block') return 'block';
  if (animation === 'evade') return 'evade';
  if (animation === 'death') return 'death';
  if (animation === 'win') return 'win';
  return 'combat_idle';
}

function fileAction(action: LpcAction): string {
  if (action === 'win') return 'combat_idle';
  // Our current armor/legs/feet run sheets are copied from walk (9 frames),
  // while the body run is a real 8-frame LPC run. Mixing them makes the legs
  // visibly drift. Use the 9-frame walk sheet for LPC displacement and play it
  // at run speed so all equipment layers stay phase-aligned.
  if (action === 'run') return 'walk';
  return action;
}

function p(path: string): string {
  return `/lpc-combat/${path}`;
}

function layerList(lpc: Partial<LpcAppearance>, action: LpcAction): Layer[] {
  const a = fileAction(action);
  const head = value(lpc.head, ['humanMale', 'humanGaunt', 'humanPlump', 'humanElder'] as const, 'humanMale');
  const headwear = value(lpc.headwear, [
    'none',
    'armet',
    'barbuta',
    'greathelm',
    'maximus',
    'cedricHelmet',
    'jasonHelmet',
  ] as const, 'none');
  const hair = headwear === 'none'
    ? value(lpc.hair, ['none', 'bedhead', 'bob', 'afro', 'buzzcut', 'long', 'curlyShort', 'bangs'] as const, 'bedhead')
    : 'none';
  const customHeadSkin = headwear === 'cedricHelmet' || headwear === 'jasonHelmet';
  const wings = value(lpc.wings, ['none', 'monarchPurple', 'pixiePurple'] as const, 'none');
  const armsArmor = value(lpc.armsArmor, ['none', 'plate', 'bracers'] as const, 'none');
  const torsoArmor = value(lpc.torsoArmor, ['none', 'trenchCoat', 'plate', 'legion', 'chainmail', 'leather'] as const, 'trenchCoat');
  const legsArmor = value(lpc.legsArmor, ['none', 'plate'] as const, 'plate');
  const feetArmor = value(lpc.feetArmor, ['none', 'plate'] as const, 'plate');
  const armorColor = value(lpc.armorColor, ['steel', 'yellow', 'iron', 'bronze', 'copper', 'pink', 'purple', 'silver', 'black'] as const, 'black');

  const layers: Array<Layer | undefined> = [
    wings !== 'none' ? { src: p(`wings/${wings === 'monarchPurple' ? 'monarch' : 'pixie'}/bg/${a}.png`) } : undefined,
    { src: p(`body/male/${a}.png`) },
    legsArmor === 'plate' ? { src: p(`armor/legsPlate/${a}.png`), palette: 'metal', color: armorColor } : undefined,
    feetArmor === 'plate' ? { src: p(`armor/feetPlate/${officialFeetColor(armorColor)}/${a}.png`) } : undefined,
    torsoArmor === 'trenchCoat' ? { src: p(`armor/trenchCoat/${a}.png`), palette: 'cloth', color: armorColor } : undefined,
    torsoArmor === 'plate' ? { src: p(`armor/torsoPlate/${a}.png`), palette: 'metal', color: armorColor } : undefined,
    torsoArmor === 'legion' ? { src: p(`armor/torsoLegion/${a}.png`), palette: 'metal', color: armorColor } : undefined,
    torsoArmor === 'chainmail' ? { src: p(`armor/torsoChainmail/${a}.png`), palette: 'metal', color: armorColor } : undefined,
    torsoArmor === 'leather' ? { src: p(`armor/torsoLeather/${a}.png`), palette: 'cloth', color: armorColor } : undefined,
    armsArmor === 'plate' ? { src: p(`armor/armsPlate/${a}.png`), palette: 'metal', color: armorColor } : undefined,
    armsArmor === 'bracers' ? { src: p(`armor/armsBracers/${a}.png`), palette: 'metal', color: armorColor } : undefined,
    customHeadSkin ? undefined : { src: p(`head/${head}/${a}.png`) },
    hair !== 'none' ? { src: p(`hair/${hair}/${a}.png`) } : undefined,
    headwear !== 'none' ? { src: p(`helmet/${headwear}/${a}.png`), palette: customHeadSkin ? undefined : 'metal', color: customHeadSkin ? undefined : armorColor } : undefined,
    wings !== 'none' ? { src: p(`wings/${wings === 'monarchPurple' ? 'monarch' : 'pixie'}/fg/${a}.png`) } : undefined,
  ];
  return layers.filter(Boolean) as Layer[];
}

function layerFrame(img: HTMLImageElement, frame: number, frameCount: number): number {
  const available = Math.max(1, Math.floor(img.width / FRAME));
  if (available === frameCount) return Math.min(frame, available - 1);
  if (frameCount <= 1 || available <= 1) return 0;
  // Some LPC sheets include expanded/alternate frame columns. Keep layers in
  // the same animation phase instead of blindly taking the same column index.
  return Math.min(available - 1, Math.round((frame / (frameCount - 1)) * (available - 1)));
}


function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace('#', '').slice(0, 6);
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

function paletteFor(material: PaletteMaterial, color: string) {
  const key = ARMOR_COLOR_TO_OFFICIAL[color];
  if (material === 'metal') {
    const metalTarget = OFFICIAL_PALETTES.metal[key as keyof typeof OFFICIAL_PALETTES.metal];
    if (key === 'black' || key === 'pink' || key === 'purple' || key === 'yellow') {
      const clothTarget = OFFICIAL_PALETTES.cloth[key as keyof typeof OFFICIAL_PALETTES.cloth];
      if (clothTarget) return { source: OFFICIAL_PALETTES.metal.source, target: clothTarget };
    }
    return { source: OFFICIAL_PALETTES.metal.source, target: metalTarget ?? OFFICIAL_PALETTES.metal.steel };
  }
  const target = OFFICIAL_PALETTES.cloth[key as keyof typeof OFFICIAL_PALETTES.cloth] ?? OFFICIAL_PALETTES.cloth.black;
  return { source: OFFICIAL_PALETTES.cloth.source, target };
}

function recolorWithOfficialPalette(ctx: CanvasRenderingContext2D, material: PaletteMaterial, color: string) {
  const { source, target } = paletteFor(material, color);
  const sourceRgb = source.map(hexToRgb);
  const targetRgb = target.map(hexToRgb);
  const image = ctx.getImageData(0, 0, FRAME, FRAME);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let j = 0; j < sourceRgb.length; j += 1) {
      const src = sourceRgb[j]!;
      if (Math.abs(data[i]! - src[0]) <= 1 && Math.abs(data[i + 1]! - src[1]) <= 1 && Math.abs(data[i + 2]! - src[2]) <= 1) {
        const dst = targetRgb[j]!;
        data[i] = dst[0];
        data[i + 1] = dst[1];
        data[i + 2] = dst[2];
        break;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}


function officialFeetColor(color: string): string {
  if (color === 'yellow') return 'gold';
  if (color === 'pink') return 'brass';
  if (color === 'purple') return 'silver';
  if (color === 'black') return 'black';
  return ['steel', 'silver', 'iron', 'bronze', 'copper'].includes(color) ? color : 'steel';
}

function drawLayer(ctx: CanvasRenderingContext2D, layer: Layer, img: HTMLImageElement, frame: number, frameCount: number, row: number) {
  const sx = layerFrame(img, frame, frameCount) * FRAME;
  const sy = Math.min(row, Math.floor(img.height / FRAME) - 1) * FRAME;
  if (!layer.tint && !layer.palette) {
    ctx.drawImage(img, sx, sy, FRAME, FRAME, 0, 0, FRAME, FRAME);
    return;
  }
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = FRAME;
  layerCanvas.height = FRAME;
  const layerCtx = layerCanvas.getContext('2d');
  if (!layerCtx) return;
  layerCtx.drawImage(img, sx, sy, FRAME, FRAME, 0, 0, FRAME, FRAME);
  if (layer.palette && layer.color) {
    recolorWithOfficialPalette(layerCtx, layer.palette, layer.color);
  } else if (layer.tint) {
    layerCtx.globalCompositeOperation = 'source-atop';
    layerCtx.fillStyle = layer.tint;
    layerCtx.fillRect(0, 0, FRAME, FRAME);
  }
  ctx.drawImage(layerCanvas, 0, 0);
}

export function createLpcFightOverlay(app: PIXI.Application, lpc: Partial<LpcAppearance>, facing: 'left' | 'right'): LpcFightOverlay {
  const root = new PIXI.Container() as LpcFightOverlay;
  const direction = facing === 'right' ? 'right' : 'left';
  root.scale.set(FIGHT_SCALE, FIGHT_SCALE);
  root.x = 0;
  root.y = -122;

  const canvas = document.createElement('canvas');
  canvas.width = FRAME;
  canvas.height = FRAME;
  const ctx = canvas.getContext('2d');
  const texture = PIXI.Texture.from(canvas);
  texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  root.addChild(sprite);
  let action: LpcAction = 'combat_idle';
  let frame = 0;
  let frameCount = 2;
  let tick = 0;
  let disposed = false;
  let drawToken = 0;

  const frameMsFor = () => {
    if (action === 'combat_idle') return 240;
    if (action === 'walk') return 95;
    if (action === 'run') return 82;
    if (action === 'slash' || action === 'halfslash') return 72;
    if (action === 'thrust') return 68;
    if (action === 'hurt' || action === 'death') return 105;
    return 95;
  };

  const draw = async () => {
    if (!ctx || disposed) return;
    const token = ++drawToken;
    const layers = layerList(lpc, action);
    const images = await Promise.all(layers.map((layer) => loadImage(layer.src)));
    if (disposed || token !== drawToken) return;
    const expectedFrames = LPC_ACTION_FRAMES[action];
    const counts = images
      .filter((img): img is HTMLImageElement => Boolean(img))
      .map((img) => Math.max(1, Math.floor(img.width / FRAME)))
      .filter((count) => count >= expectedFrames || expectedFrames % count === 0);
    // Use the LPC layout frame count for each action. Some generated sheets
    // contain extra columns/rows for alternates (weapon/front-back variants),
    // so blindly using min/max loaded image width makes layers drift.
    frameCount = counts.includes(expectedFrames) ? expectedFrames : Math.max(1, Math.min(expectedFrames, ...counts));
    frame %= frameCount;
    ctx.clearRect(0, 0, FRAME, FRAME);
    const row = ROW_BY_FACING[direction];
    for (const [index, img] of images.entries()) {
      const layer = layers[index];
      if (!img || !layer) continue;
      drawLayer(ctx, layer, img, frame, frameCount, row);
    }
    texture.baseTexture.update();
  };

  root.setLpcAnimation = (name: string) => {
    const next = actionFor(name);
    if (action !== next) {
      action = next;
      frame = 0;
      tick = 0;
    }
    void draw();
  };

  root.playLpcAnimation = async (name: string, durationMs) => {
    root.setLpcAnimation(name);
    const resolvedDuration = durationMs ?? Math.max(420, frameMsFor() * frameCount + 90);
    await new Promise((resolve) => window.setTimeout(resolve, resolvedDuration));
  };

  const advance = () => {
    if (disposed) return;
    tick += app.ticker.deltaMS;
    const frameMs = frameMsFor();
    if (tick < frameMs) return;
    tick = 0;
    frame = (frame + 1) % frameCount;
    void draw();
  };
  app.ticker.add(advance);
  root.destroyLpcOverlay = () => {
    disposed = true;
    app.ticker.remove(advance);
  };
  root.once('removed', root.destroyLpcOverlay);

  void draw();
  return root;
}
