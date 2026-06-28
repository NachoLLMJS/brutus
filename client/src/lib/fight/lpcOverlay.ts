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
type Layer = { src: string };

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
  return action;
}

function p(path: string): string {
  return `/lpc-combat/${path}`;
}

function layerList(lpc: Partial<LpcAppearance>, action: LpcAction): Layer[] {
  const a = fileAction(action);
  const head = value(lpc.head, ['humanMale', 'humanGaunt', 'humanPlump', 'humanElder'] as const, 'humanMale');
  const headwear = value(lpc.headwear, ['none', 'armet', 'barbuta', 'flattop', 'greathelm', 'horned', 'maximus', 'sugarloafSimple', 'xeon'] as const, 'none');
  const hair = headwear === 'none'
    ? value(lpc.hair, ['none', 'bedhead', 'bob', 'afro', 'buzzcut', 'long', 'curlyShort', 'bangs'] as const, 'bedhead')
    : 'none';
  const wings = value(lpc.wings, ['none', 'monarchPurple', 'pixiePurple'] as const, 'none');
  const armsArmor = value(lpc.armsArmor, ['none', 'plate', 'bracers'] as const, 'none');
  const torsoArmor = value(lpc.torsoArmor, ['none', 'plate', 'legion', 'chainmail'] as const, 'plate');
  const legsArmor = value(lpc.legsArmor, ['none', 'plate'] as const, 'plate');
  const feetArmor = value(lpc.feetArmor, ['none', 'plate'] as const, 'plate');
  const armorColor = value(lpc.armorColor, ['steel', 'gold', 'iron', 'bronze', 'copper', 'brass', 'silver', 'black'] as const, 'steel');
  const feetColor = armorColor === 'black' ? 'black' : armorColor;
  const weapon = value(lpc.weapon, ['none', 'swordSteel', 'swordGold', 'mace', 'waraxe', 'halberd'] as const, 'none');

  const layers: Array<Layer | undefined> = [
    wings !== 'none' ? { src: p(`wings/${wings === 'monarchPurple' ? 'monarch' : 'pixie'}/bg/${a}.png`) } : undefined,
    { src: p(`body/male/${a}.png`) },
    { src: p(`head/${head}/${a}.png`) },
    legsArmor === 'plate' ? { src: p(`armor/legsPlate/${a}.png`) } : undefined,
    feetArmor === 'plate' ? { src: p(`armor/feetPlate/${feetColor}/${a}.png`) } : undefined,
    torsoArmor === 'plate' ? { src: p(`armor/torsoPlate/${a}.png`) } : undefined,
    torsoArmor === 'legion' ? { src: p(`armor/torsoLegion/${a}.png`) } : undefined,
    torsoArmor === 'chainmail' ? { src: p(`armor/torsoChainmail/${a}.png`) } : undefined,
    armsArmor === 'plate' ? { src: p(`armor/armsPlate/${a}.png`) } : undefined,
    armsArmor === 'bracers' ? { src: p(`armor/armsBracers/${a}.png`) } : undefined,
    hair !== 'none' ? { src: p(`hair/${hair}/${a}.png`) } : undefined,
    headwear !== 'none' ? { src: p(`helmet/${headwear}/${a}.png`) } : undefined,
    weapon !== 'none' ? { src: p(`weapon/${weapon}/${a}.png`) } : undefined,
    wings !== 'none' ? { src: p(`wings/${wings === 'monarchPurple' ? 'monarch' : 'pixie'}/fg/${a}.png`) } : undefined,
  ];
  return layers.filter(Boolean) as Layer[];
}

function drawLayer(ctx: CanvasRenderingContext2D, img: HTMLImageElement, frame: number, row: number) {
  const sx = Math.min(frame, Math.floor(img.width / FRAME) - 1) * FRAME;
  const sy = Math.min(row, Math.floor(img.height / FRAME) - 1) * FRAME;
  ctx.drawImage(img, sx, sy, FRAME, FRAME, 0, 0, FRAME, FRAME);
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
    const counts = images
      .filter((img): img is HTMLImageElement => Boolean(img))
      .map((img) => Math.max(1, Math.floor(img.width / FRAME)));
    // Use the shortest loaded layer so body/armour/weapon stay in sync.
    frameCount = counts.length > 0 ? Math.max(1, Math.min(...counts)) : 1;
    frame %= frameCount;
    ctx.clearRect(0, 0, FRAME, FRAME);
    const row = ROW_BY_FACING[direction];
    for (const img of images) {
      if (!img) continue;
      drawLayer(ctx, img, frame, row);
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
