import { useEffect, useMemo, useRef, useState } from 'react';
import bodyMaleIdle from '@/assets/lpc-test/body-male-idle.png?url';
import headHumanMaleIdle from '@/assets/lpc-test/head-human-male-idle.png?url';
import headHumanGauntIdle from '@/assets/lpc-test/head-human-gaunt-idle.png?url';
import headHumanPlumpIdle from '@/assets/lpc-test/head-human-plump-idle.png?url';
import headHumanElderIdle from '@/assets/lpc-test/head-human-elder-idle.png?url';
import hairAfroIdle from '@/assets/lpc-test/hair-afro-idle.png?url';
import hairBangsIdle from '@/assets/lpc-test/hair-bangs-idle.png?url';
import hairBedheadIdle from '@/assets/lpc-test/hair-bedhead-idle.png?url';
import hairBobIdle from '@/assets/lpc-test/hair-bob-idle.png?url';
import hairBuzzcutIdle from '@/assets/lpc-test/hair-buzzcut-idle.png?url';
import hairCurlyShortIdle from '@/assets/lpc-test/hair-curly-short-idle.png?url';
import hairLongIdle from '@/assets/lpc-test/hair-long-idle.png?url';
import wingsMonarchPurpleBgWalk from '@/assets/lpc-test/wings-monarch-purple-bg-walk.png?url';
import wingsMonarchPurpleFgWalk from '@/assets/lpc-test/wings-monarch-purple-fg-walk.png?url';
import wingsPixiePurpleBgWalk from '@/assets/lpc-test/wings-pixie-purple-bg-walk.png?url';
import wingsPixiePurpleFgWalk from '@/assets/lpc-test/wings-pixie-purple-fg-walk.png?url';
import helmetArmetIdle from '@/assets/lpc-test/helmet-armet-idle.png?url';
import helmetBarbutaIdle from '@/assets/lpc-test/helmet-barbuta-idle.png?url';
import helmetGreathelmIdle from '@/assets/lpc-test/helmet-greathelm-idle.png?url';
import helmetMaximusIdle from '@/assets/lpc-test/helmet-maximus-idle.png?url';
import armorLeatherIdle from '@/assets/lpc-test/armor-leather-idle.png?url';
import armsArmorPlateIdle from '@/assets/lpc-test/arms-armor-plate-idle.png?url';
import armsBracersIdle from '@/assets/lpc-test/arms-bracers-idle.png?url';
import torsoArmorPlateIdle from '@/assets/lpc-test/torso-armor-plate-idle.png?url';
import torsoArmorLegionIdle from '@/assets/lpc-test/torso-armor-legion-idle.png?url';
import torsoChainmailIdle from '@/assets/lpc-test/torso-chainmail-idle.png?url';
import legsArmorPlateIdle from '@/assets/lpc-test/legs-armor-plate-idle.png?url';
import feetArmorPlateSteelIdle from '@/assets/lpc-test/feet-armor-plate-steel-idle.png?url';

const FRAME = 64;
const DIRECTIONS = [
  { key: 'up', label: 'Espalda', row: 0 },
  { key: 'left', label: 'Izq.', row: 1 },
  { key: 'down', label: 'Frente', row: 2 },
  { key: 'right', label: 'Der.', row: 3 },
] as const;

type DirectionKey = (typeof DIRECTIONS)[number]['key'];
type LpcOption<K extends string> = { key: K; label: string; src?: string; bgSrc?: string; fgSrc?: string; tint?: string };
type Layer = { src: string; tint?: string };

export type LpcHeadKey = 'humanMale' | 'humanGaunt' | 'humanPlump' | 'humanElder';
export type LpcHairKey = 'bedhead' | 'bob' | 'afro' | 'buzzcut' | 'long' | 'curlyShort' | 'bangs' | 'none';
export type LpcWingsKey = 'none' | 'monarchPurple' | 'pixiePurple';
export type LpcHeadwearKey = 'none' | 'armet' | 'barbuta' | 'greathelm' | 'maximus';
export type LpcArmorColorKey = 'steel' | 'yellow' | 'iron' | 'bronze' | 'copper' | 'pink' | 'purple' | 'silver' | 'black';
export type LpcArmsArmorKey = 'none' | 'plate' | 'bracers';
export type LpcTorsoArmorKey = 'none' | 'trenchCoat' | 'plate' | 'legion' | 'chainmail';
export type LpcLegsArmorKey = 'none' | 'plate';
export type LpcFeetArmorKey = 'none' | 'plate';
export type LpcWeaponKey = 'none';

const ARMOR_TINTS: Record<LpcArmorColorKey, string> = {
  steel: 'rgba(185, 196, 202, 0.28)',
  yellow: 'rgba(255, 221, 54, 0.36)',
  iron: 'rgba(106, 117, 128, 0.3)',
  bronze: 'rgba(176, 105, 43, 0.3)',
  copper: 'rgba(210, 104, 58, 0.28)',
  pink: 'rgba(255, 83, 184, 0.34)',
  purple: 'rgba(153, 91, 255, 0.36)',
  silver: 'rgba(225, 230, 235, 0.34)',
  black: 'rgba(20, 24, 31, 0.44)',
};

export const LPC_ARMOR_COLOR_OPTIONS = [
  { key: 'black', label: 'Black' },
  { key: 'purple', label: 'Purple' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'pink', label: 'Pink' },
  { key: 'silver', label: 'Silver' },
  { key: 'steel', label: 'Steel' },
  { key: 'iron', label: 'Iron' },
  { key: 'bronze', label: 'Bronze' },
  { key: 'copper', label: 'Copper' },
] as const satisfies ReadonlyArray<LpcOption<LpcArmorColorKey>>;

export const LPC_HEAD_OPTIONS = [
  { key: 'humanMale', label: 'Human head normal', src: headHumanMaleIdle },
  { key: 'humanGaunt', label: 'Human head gaunt', src: headHumanGauntIdle },
  { key: 'humanPlump', label: 'Human head plump', src: headHumanPlumpIdle },
  { key: 'humanElder', label: 'Human head elder', src: headHumanElderIdle },
] as const satisfies ReadonlyArray<LpcOption<LpcHeadKey>>;

export const LPC_HAIR_OPTIONS = [
  { key: 'none', label: 'Sin pelo' },
  { key: 'bedhead', label: 'Bedhead', src: hairBedheadIdle },
  { key: 'bob', label: 'Bob', src: hairBobIdle },
  { key: 'afro', label: 'Afro', src: hairAfroIdle },
  { key: 'buzzcut', label: 'Buzzcut', src: hairBuzzcutIdle },
  { key: 'long', label: 'Long', src: hairLongIdle },
  { key: 'curlyShort', label: 'Curly', src: hairCurlyShortIdle },
  { key: 'bangs', label: 'Bangs', src: hairBangsIdle },
] as const satisfies ReadonlyArray<LpcOption<LpcHairKey>>;

export const LPC_WINGS_OPTIONS = [
  { key: 'none', label: 'Sin wings' },
  { key: 'monarchPurple', label: 'Monarch wings moradas', bgSrc: wingsMonarchPurpleBgWalk, fgSrc: wingsMonarchPurpleFgWalk },
  { key: 'pixiePurple', label: 'Pixie wings moradas', bgSrc: wingsPixiePurpleBgWalk, fgSrc: wingsPixiePurpleFgWalk },
] as const satisfies ReadonlyArray<LpcOption<LpcWingsKey>>;

export const LPC_HEADWEAR_OPTIONS = [
  { key: 'none', label: 'No headwear' },
  { key: 'armet', label: 'Armet', src: helmetArmetIdle },
  { key: 'barbuta', label: 'Barbuta', src: helmetBarbutaIdle },
  { key: 'greathelm', label: 'Greathelm', src: helmetGreathelmIdle },
  { key: 'maximus', label: 'Maximus', src: helmetMaximusIdle },
] as const satisfies ReadonlyArray<LpcOption<LpcHeadwearKey>>;

export const LPC_ARMS_ARMOR_OPTIONS = [
  { key: 'none', label: 'No arms armour' },
  { key: 'plate', label: 'Arms armour plate', src: armsArmorPlateIdle },
  { key: 'bracers', label: 'Bracers', src: armsBracersIdle },
] as const satisfies ReadonlyArray<LpcOption<LpcArmsArmorKey>>;

export const LPC_TORSO_ARMOR_OPTIONS = [
  { key: 'none', label: 'No jacket/armour' },
  { key: 'trenchCoat', label: 'Trench coat', src: armorLeatherIdle },
  { key: 'plate', label: 'Torso armour plate', src: torsoArmorPlateIdle },
  { key: 'legion', label: 'Torso legion', src: torsoArmorLegionIdle },
  { key: 'chainmail', label: 'Chainmail', src: torsoChainmailIdle },
] as const satisfies ReadonlyArray<LpcOption<LpcTorsoArmorKey>>;

export const LPC_LEGS_ARMOR_OPTIONS = [
  { key: 'none', label: 'Sin legs armour' },
  { key: 'plate', label: 'Legs armour plate', src: legsArmorPlateIdle },
] as const satisfies ReadonlyArray<LpcOption<LpcLegsArmorKey>>;

export const LPC_FEET_ARMOR_OPTIONS = [
  { key: 'none', label: 'Sin feet armour' },
  { key: 'plate', label: 'Feet armour plate', src: feetArmorPlateSteelIdle },
] as const satisfies ReadonlyArray<LpcOption<LpcFeetArmorKey>>;

export const LPC_WEAPON_OPTIONS = [
  { key: 'none', label: 'Sin weapon' },
] as const satisfies ReadonlyArray<LpcOption<LpcWeaponKey>>;

interface LpcAvatarPreviewProps {
  head?: LpcHeadKey;
  hair?: LpcHairKey;
  wings?: LpcWingsKey;
  headwear?: LpcHeadwearKey;
  armsArmor?: LpcArmsArmorKey;
  torsoArmor?: LpcTorsoArmorKey;
  legsArmor?: LpcLegsArmorKey;
  feetArmor?: LpcFeetArmorKey;
  armorColor?: LpcArmorColorKey;
  weapon?: LpcWeaponKey;
  scale?: number;
  compact?: boolean;
}

function pick<K extends string>(options: ReadonlyArray<LpcOption<K>>, key: K): LpcOption<K> | undefined {
  return options.find((o) => o.key === key);
}

function toLayer(option?: { src?: string; tint?: string }): Layer | undefined {
  return option?.src ? { src: option.src, tint: option.tint } : undefined;
}

function tintLayer(option: LpcOption<string> | undefined, tint: string): Layer | undefined {
  return option?.src ? { src: option.src, tint } : undefined;
}

function layerPaths(props: Required<Omit<LpcAvatarPreviewProps, 'scale' | 'compact'>>) {
  const wings = pick(LPC_WINGS_OPTIONS, props.wings);
  const armorTint = ARMOR_TINTS[props.armorColor];
  const headwear = pick(LPC_HEADWEAR_OPTIONS, props.headwear);
  const headwearLayer = tintLayer(headwear, armorTint);
  return [
    wings?.bgSrc ? { src: wings.bgSrc } : undefined,
    { src: bodyMaleIdle },
    toLayer(pick(LPC_HEAD_OPTIONS, props.head)),
    tintLayer(pick(LPC_LEGS_ARMOR_OPTIONS, props.legsArmor), armorTint),
    tintLayer(pick(LPC_FEET_ARMOR_OPTIONS, props.feetArmor), armorTint),
    tintLayer(pick(LPC_TORSO_ARMOR_OPTIONS, props.torsoArmor), armorTint),
    tintLayer(pick(LPC_ARMS_ARMOR_OPTIONS, props.armsArmor), armorTint),
    toLayer(pick(LPC_HAIR_OPTIONS, props.hair)),
    headwearLayer,
    toLayer(pick(LPC_WEAPON_OPTIONS, props.weapon)),
    wings?.fgSrc ? { src: wings.fgSrc } : undefined,
  ].filter(Boolean) as Layer[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  layer: Layer,
  frame: number,
  row: number,
  scale: number,
) {
  if (!layer.tint) {
    ctx.drawImage(img, frame * FRAME, row * FRAME, FRAME, FRAME, 0, 0, FRAME * scale, FRAME * scale);
    return;
  }
  const off = document.createElement('canvas');
  off.width = FRAME;
  off.height = FRAME;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;
  offCtx.imageSmoothingEnabled = false;
  offCtx.drawImage(img, frame * FRAME, row * FRAME, FRAME, FRAME, 0, 0, FRAME, FRAME);
  offCtx.globalCompositeOperation = 'source-atop';
  offCtx.fillStyle = layer.tint;
  offCtx.fillRect(0, 0, FRAME, FRAME);
  offCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, 0, 0, FRAME * scale, FRAME * scale);
}

export function LpcAvatarPreview({
  head = 'humanMale',
  hair = 'bedhead',
  wings = 'none',
  headwear = 'none',
  armsArmor = 'none',
  torsoArmor = 'plate',
  legsArmor = 'plate',
  feetArmor = 'plate',
  armorColor = 'steel',
  weapon = 'none',
  scale = 4,
  compact = false,
}: LpcAvatarPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [direction, setDirection] = useState<DirectionKey>('down');
  const [frame, setFrame] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const paths = useMemo(
    () => layerPaths({ head, hair, wings, headwear, armsArmor, torsoArmor, legsArmor, feetArmor, armorColor, weapon }),
    [head, hair, wings, headwear, armsArmor, torsoArmor, legsArmor, feetArmor, armorColor, weapon],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % 2), 450);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setError(null);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const images = await Promise.all(paths.map((layer) => loadImage(layer.src)));
        if (cancelled) return;
        const row = DIRECTIONS.find((d) => d.key === direction)?.row ?? 2;
        canvas.width = FRAME * scale;
        canvas.height = FRAME * scale;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        images.forEach((img, i) => drawLayer(ctx, img, paths[i]!, frame, row, scale));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo renderizar LPC');
      }
    })();
    return () => { cancelled = true; };
  }, [direction, frame, paths, scale]);

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2" style={{ imageRendering: 'pixelated' }}>
        <canvas ref={canvasRef} width={FRAME * scale} height={FRAME * scale} aria-label="Preview LPC" />
        {error && <p className="text-xs text-blood">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-900/50 bg-black/30 p-4 shadow-inner">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-display text-lg uppercase tracking-widest text-amber-100">Preview LPC</div>
          <div className="text-xs text-amber-200/70">Human head + helmets + monarch wings + armour + weapons.</div>
        </div>
        <span className="rounded-full border border-amber-700/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-200">64x64 LPC</span>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="rounded-xl border border-amber-800/70 bg-[#111016] p-3" style={{ imageRendering: 'pixelated' }}>
          <canvas ref={canvasRef} width={FRAME * scale} height={FRAME * scale} aria-label="Preview LPC" />
        </div>
        <div className="flex flex-1 flex-col gap-3 text-sm text-amber-100/80">
          <div className="grid grid-cols-2 gap-2">
            {DIRECTIONS.map((dir) => (
              <button key={dir.key} type="button" onClick={() => setDirection(dir.key)} className={direction === dir.key ? 'btn-primary' : 'btn'}>
                {dir.label}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-amber-100/60">Capas compatibles LPC; weapons tienen equivalentes en combat/attack en el repo fuente.</p>
          {error && <p className="text-xs text-blood">{error}</p>}
        </div>
      </div>
    </div>
  );
}
