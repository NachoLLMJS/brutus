// Porteado de LaBrute (`labrute/client/src/utils/fight/FighterHolder.ts`).
// Adaptado a Brutus v3:
//   - sin @labrute/prisma / @labrute/core; usa nuestro `core` y string literals.
//   - solo modelo 'brute' (male/female). Pets/bosses son TODO.
//   - sin bosses → sin AdjustmentFilter.
//   - pixi 6.5.9 compatible (no usa app.renderer.destroyed, etc).
//
// Renderiza un bruto compuesto que reproduce animaciones reales (idle/run/hit/
// death/etc.) usando los Symbols de `brutus-fla-parser` (fork local de
// labrute-fla-parser que vive en `packages/brutus-fla-parser/`).

import {
  type BruteBodyPart,
  type BruteColor,
  type BruteGender,
  readBodyString,
  readColorString,
} from 'core';
import {
  type FramePart,
  type Svg,
  type Symbol as LaBruteSymbol,
  Symbol475, Symbol476, Symbol478, Symbol479, Symbol488, Symbol489, Symbol490,
  Symbol491, Symbol493, Symbol494, Symbol495, Symbol496, Symbol497, Symbol498,
  Symbol503, Symbol505, Symbol506, Symbol507, Symbol508, Symbol509, Symbol510,
  Symbol513, Symbol516, Symbol517, Symbol541, Symbol542, Symbol543, Symbol544,
  Symbol545, Symbol546,
  Symbol846, Symbol847, Symbol848, Symbol849, Symbol851, Symbol854, Symbol855,
  Symbol856, Symbol857, Symbol858, Symbol859, Symbol860, Symbol861, Symbol863,
  Symbol864, Symbol865, Symbol866, Symbol867, Symbol868, Symbol869, Symbol870,
  Symbol871, Symbol875, Symbol876, Symbol877, Symbol878, Symbol879, Symbol880,
  // Pets (porteado de LaBrute FighterHolder.ts:82-183)
  Symbol894, Symbol903, Symbol904, Symbol905, Symbol906, Symbol907, Symbol910,
  Symbol911, Symbol912, Symbol913,
  Symbol935, Symbol936, Symbol937, Symbol938, Symbol939, Symbol940, Symbol941,
  Symbol942, Symbol943, Symbol944,
} from 'brutus-fla-parser';
import * as PIXI from 'pixi.js';
import { Filter, Matrix, Texture } from 'pixi.js';

// ───────────────────────── Animation table ─────────────────────────

export type AnimationName =
  | 'idle' | 'run' | 'arrive' | 'evade' | 'block' | 'death'
  | 'hit-0' | 'hit-1' | 'hit-2' | 'hit'
  | 'attack' | 'fist' | 'estoc' | 'slash' | 'whip'
  | 'throw' | 'prepare-throw' | 'launch'
  | 'grab' | 'grabbed' | 'steal' | 'stolen' | 'trapped'
  | 'drink' | 'eat' | 'strengthen' | 'equip' | 'trash' | 'monk'
  | 'win' | 'train' | 'train2';

type ModelKey = 'male' | 'female' | 'dog' | 'bear' | 'panther';

const ANIMATIONS: Record<ModelKey, Partial<Record<AnimationName, LaBruteSymbol>>> = {
  male: {
    idle: Symbol475,
    monk: Symbol476,
    fist: Symbol478,
    arrive: Symbol479,
    'hit-0': Symbol488,
    'hit-1': Symbol489,
    'hit-2': Symbol490,
    run: Symbol491,
    equip: Symbol493,
    evade: Symbol494,
    block: Symbol495,
    trash: Symbol496,
    death: Symbol497,
    estoc: Symbol498,
    slash: Symbol503,
    throw: Symbol505,
    'prepare-throw': Symbol506,
    grab: Symbol507,
    steal: Symbol508,
    grabbed: Symbol509,
    stolen: Symbol510,
    trapped: Symbol513,
    drink: Symbol516,
    strengthen: Symbol517,
    whip: Symbol541,
    launch: Symbol542,
    win: Symbol543,
    train: Symbol544,
    train2: Symbol545,
    eat: Symbol546,
  },
  female: {
    idle: Symbol846,
    monk: Symbol847,
    fist: Symbol848,
    arrive: Symbol849,
    hit: Symbol851,
    run: Symbol854,
    equip: Symbol855,
    evade: Symbol856,
    block: Symbol857,
    trash: Symbol858,
    death: Symbol859,
    estoc: Symbol860,
    slash: Symbol861,
    throw: Symbol863,
    'prepare-throw': Symbol864,
    grab: Symbol865,
    steal: Symbol866,
    grabbed: Symbol867,
    stolen: Symbol868,
    trapped: Symbol869,
    drink: Symbol870,
    strengthen: Symbol871,
    whip: Symbol875,
    launch: Symbol876,
    win: Symbol877,
    train: Symbol878,
    train2: Symbol879,
    eat: Symbol880,
  },
  // Pets (porteado de `labrute/.../FighterHolder.ts:82-183`).
  // Solo tienen un subset de animaciones; el resto cae al fallback de
  // `setAnimation` que llama 'idle' cuando la pedida no existe.
  dog: {
    idle: Symbol894,
    attack: Symbol903,
    arrive: Symbol904,
    hit: Symbol905,
    run: Symbol906,
    evade: Symbol907,
    death: Symbol910,
    grab: Symbol911,
    grabbed: Symbol912,
    trapped: Symbol913,
  },
  bear: {
    idle: Symbol935,
    attack: Symbol936,
    arrive: Symbol937,
    hit: Symbol938,
    run: Symbol939,
    evade: Symbol940,
    death: Symbol941,
    grab: Symbol942,
    grabbed: Symbol943,
    trapped: Symbol944,
  },
  // Pantera comparte sprites con dog (mismo set de Symbols en LaBrute).
  panther: {
    idle: Symbol894,
    attack: Symbol903,
    arrive: Symbol904,
    hit: Symbol905,
    run: Symbol906,
    evade: Symbol907,
    death: Symbol910,
    grab: Symbol911,
    grabbed: Symbol912,
    trapped: Symbol913,
  },
};

/**
 * Eventos disparados en frames específicos de cada animación.
 * Porteado de LaBrute (`FighterHolder.ts:716-740`).
 *
 * Formato: `FRAME_EVENTS[model][animation][frameIdx] = eventName`
 * El holder dispara `${animation}:${eventName}` cuando el frame matchea.
 *
 * El consumer se suscribe vía `holder.once('fist:hit', cb)` para sincronizar
 * SFX y daño visual con el frame exacto del impacto.
 */
const FRAME_EVENTS: Record<ModelKey, Partial<Record<AnimationName, Record<number, string>>>> = {
  male: {
    fist: { 2: 'hit' },
    estoc: { 4: 'hit' },
    slash: { 5: 'hit' },
    whip: { 4: 'hit' },
    throw: { 6: 'launch' },
    block: { 2: 'pose' },
    evade: { 2: 'dodge' },
    trash: { 3: 'trashed' },
    win: { 52: 'hand-raised' },
    death: { 24: 'drop' },
  },
  female: {
    fist: { 2: 'hit' },
    estoc: { 4: 'hit' },
    slash: { 5: 'hit' },
    whip: { 4: 'hit' },
    throw: { 6: 'launch' },
    block: { 2: 'pose' },
    evade: { 2: 'dodge' },
    trash: { 3: 'trashed' },
    win: { 27: 'hand-raised' },
    death: { 24: 'drop' },
  },
  dog: { attack: { 2: 'hit' }, death: { 16: 'drop' } },
  bear: { attack: { 4: 'hit' }, death: { 16: 'drop' } },
  panther: { attack: { 2: 'hit' }, death: { 16: 'drop' } },
};

const LOOP_START: Record<ModelKey, Partial<Record<AnimationName, number>>> = {
  male: {
    idle: 0,
    monk: 6,
    run: 0,
    death: 24,
    trapped: 11,
    train: 0,
    train2: 0,
  },
  female: {
    idle: 0,
    monk: 12,
    run: 0,
    death: 24,
    trapped: 11,
    train: 0,
    train2: 0,
  },
  dog: { idle: 0, run: 0, death: 16, trapped: 0 },
  bear: { idle: 0, run: 0, death: 16, trapped: 0 },
  panther: { idle: 0, run: 0, death: 16, trapped: 0 },
};

const ANIMATION_SYMBOL_NAMES: Record<ModelKey, string[]> = {
  male: Object.values(ANIMATIONS.male).map((a) => a?.name ?? '').filter(Boolean),
  female: Object.values(ANIMATIONS.female).map((a) => a?.name ?? '').filter(Boolean),
  dog: Object.values(ANIMATIONS.dog).map((a) => a?.name ?? '').filter(Boolean),
  bear: Object.values(ANIMATIONS.bear).map((a) => a?.name ?? '').filter(Boolean),
  panther: Object.values(ANIMATIONS.panther).map((a) => a?.name ?? '').filter(Boolean),
};

const SCALE = 1;

// Tamaño base de un bruto humanoide, en px lógicos del stage.
const FIGHTER_BASE_HEIGHT = 160;
const FIGHTER_BASE_WIDTH = 120;

type SvgsToLoad = { svg: Svg; count: number }[];

const matrixFromObject = (obj: FramePart['transform'], scale = 1) =>
  new Matrix(
    obj?.a ?? 1,
    obj?.b ?? 0,
    obj?.c ?? 0,
    obj?.d ?? 1,
    (obj?.tx ?? 0) * scale,
    (obj?.ty ?? 0) * scale,
  );

const ColorOffsetShader = `
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform vec3 offset;
uniform vec3 mult;

void main(void){
  vec4 color = texture2D(uSampler, vTextureCoord);
  gl_FragColor = vec4(vec3((color.r / color.a) * mult.r + offset.r / 255.0, (color.g / color.a) * mult.g + offset.g / 255.0, (color.b / color.a) * mult.b + offset.b / 255.0) * color.a, color.a);
}
`;

// Símbolo de arma usado por las animaciones (Symbol68 contiene 28 frames de
// armas). Tabla porteada de `LaBrute_ref/client/src/utils/fight/FighterHolder.ts:379-408`.
const WEAPON_SYMBOL = 'Symbol68';
const WEAPON_FRAMES: (string | null)[] = [
  null,           // 0
  'knife',        // 1
  'broadsword',   // 2
  'lance',        // 3
  'baton',        // 4
  'trident',      // 5
  'hatchet',      // 6
  'scimitar',     // 7
  'axe',          // 8
  'sword',        // 9
  'fan',          // 10
  'shuriken',     // 11
  null,           // 12
  'bumps',        // 13
  'morningStar',  // 14
  'mammothBone',  // 15
  'flail',        // 16
  'whip',         // 17
  'sai',          // 18
  'leek',         // 19
  'mug',          // 20
  'fryingPan',    // 21
  'piopio',       // 22
  'halbard',      // 23
  'trombone',     // 24
  'keyboard',     // 25
  'noodleBowl',   // 26
  'racquet',      // 27
];

/**
 * Mapeo de los ids snake_case de Brutus (catálogo en `core/src/data/weapons.ts`)
 * al índice de frame del Symbol68 de LaBrute. Ids sin match exacto caen a un
 * frame fallback razonable. Mantener sincronizado con `client/src/lib/assets.ts`.
 */
const BRUTUS_TO_FRAME: Record<string, number> = {
  knife: 1,
  broadsword: 2,
  lance: 3,
  bo_staff: 4,
  trident: 5,
  hatchet: 6,
  scimitar: 7,
  axe: 8,
  katana: 9,
  fan: 10,
  shuriken: 11,
  morning_star: 14,
  mighty_hammer: 15,    // mammothBone
  nunchaku: 16,         // flail
  flail: 16,
  whip: 17,
  sai: 18,
  mug: 20,
  frying_pan: 21,
  crossbow: 22,         // piopio (joke)
  halberd: 23,
  wrench: 25,           // keyboard (joke)
  noodle_bowl: 26,
  // Fallbacks
  dagger: 1,            // knife
  claymore: 2,          // broadsword
  rapier: 9,            // sword
  chain_whip: 17,       // whip
};

const SHIELD_SYMBOL = 'Symbol472';

// ───────────────────────── Constructor input ─────────────────────────

export interface FighterHolderInput {
  /**
   * Tipo visual del fighter:
   *   - 'brute' (default): bruto humanoide; usa gender + body + bodyColors
   *   - 'dog' / 'bear' / 'panther': pets; ignora body/colors/gender
   */
  model?: 'brute' | 'dog' | 'bear' | 'panther';
  /** Solo aplica si model='brute' (o no especificado). */
  gender?: BruteGender;
  body?: string;
  bodyColors?: string;
  /** Si querés un scale extra sobre 1. */
  scale?: number;
}

// ───────────────────────────── FighterHolder ─────────────────────────────

export default class FighterHolder {
  readonly container: PIXI.Container;
  readonly shadow: PIXI.Container = new PIXI.Container();

  /** Animation key actualmente cargada. */
  animation: AnimationName = 'idle';
  /** Multiplicador de fps. 1 = velocidad normal (30fps base). */
  animationSpeed = 1;

  readonly baseWidth: number;
  readonly baseHeight: number;

  // Estado interno
  readonly #model: ModelKey;
  readonly #colors: Record<BruteColor, string>;
  readonly #parts: Record<BruteBodyPart, number>;
  readonly #scale: number;

  #animationContainer: PIXI.Container | null = null;
  #animationSymbol: LaBruteSymbol | null = null;
  #frame = 0;
  #frameCount = 0;
  #timer = 0;
  #playing = true;
  #usedSvgs: Record<string, number> = {};
  #svgs: PIXI.Sprite[] = [];
  #destroyed = false;
  #facing: 'left' | 'right' = 'right';
  /** Frame del WEAPON_SYMBOL a renderizar; 0 = sin arma. */
  #weaponFrame = 0;

  // Referencias para tick + cleanup
  #app: PIXI.Application;
  #tickerCb: (() => void) | null = null;

  // Eventos por animación → resolvers de Promesas pendientes.
  #pendingResolvers: Map<string, (() => void)[]> = new Map();

  // Listeners persistentes / one-shot por evento (`${animation}:${eventName}`).
  #listeners: Map<string, Set<(event: string) => void>> = new Map();
  #onceListeners: Map<string, Set<(event: string) => void>> = new Map();

  constructor(app: PIXI.Application, input: FighterHolderInput) {
    this.#app = app;
    // model='brute' (legacy) o no definido + gender => bruto humanoide.
    if (!input.model || input.model === 'brute') {
      this.#model = input.gender ?? 'male';
    } else {
      this.#model = input.model;
    }
    // Pets no tienen body/colors significativos; usamos defaults para que
    // readColorString/readBodyString no fallen.
    const isBrute = this.#model === 'male' || this.#model === 'female';
    const gender: BruteGender = this.#model === 'female' ? 'female' : 'male';
    this.#colors = readColorString(
      gender,
      isBrute ? input.bodyColors || '0'.repeat(32) : '0'.repeat(32),
    );
    this.#parts = readBodyString(isBrute ? input.body || '0'.repeat(11) : '0'.repeat(11));
    this.#scale = input.scale ?? 1;

    this.baseWidth = FIGHTER_BASE_WIDTH * SCALE * this.#scale;
    this.baseHeight = FIGHTER_BASE_HEIGHT * SCALE * this.#scale;

    const root = new PIXI.Container();
    root.sortableChildren = true;
    this.container = root;

    // Sombra
    const shadowGraphics = new PIXI.Graphics();
    shadowGraphics.beginFill(0x000000, 0.4);
    shadowGraphics.drawEllipse(0, 0, 30, 10);
    shadowGraphics.endFill();
    const shadowSprite = new PIXI.Sprite(app.renderer.generateTexture(shadowGraphics));
    shadowSprite.anchor.set(0.5, 0.5);
    shadowSprite.width = this.baseWidth;
    shadowSprite.height = (this.baseHeight * 30) / this.baseWidth;
    shadowSprite.position.set(0, -0.02 * this.baseHeight);
    shadowSprite.scale.set(0.72, 0.7);
    shadowSprite.filters = [new PIXI.filters.BlurFilter(this.baseWidth * 0.065)];
    this.shadow.addChild(shadowSprite);
    this.shadow.alpha = 1;
    this.container.addChild(this.shadow);

    // Containers + SVGs por animación
    const animations = ANIMATIONS[this.#model];
    const maxSvgs: SvgsToLoad = [];

    for (const animation of Object.values(animations)) {
      if (!animation) continue;

      const animationContainer = new PIXI.Container();
      animationContainer.name = animation.name;
      animationContainer.sortableChildren = true;
      animationContainer.visible = false;
      this.container.addChild(animationContainer);

      // La animación inicial es 'idle'.
      if (animation.name === animations[this.animation]?.name) {
        animationContainer.visible = true;
        this.#animationContainer = animationContainer;
        this.#animationSymbol = animation;
        this.#frameCount = animation.frames?.length ?? 0;
      }

      for (const frame of animation.frames ?? []) {
        const svgsToLoad: SvgsToLoad = [];
        this.#initializeContainersAndGetSvgsToLoad(
          svgsToLoad,
          animationContainer,
          animation.parts,
          frame,
        );
        for (const svg of svgsToLoad) {
          const existing = maxSvgs.find((s) => s.svg.name === svg.svg.name);
          if (!existing) maxSvgs.push(svg);
          else existing.count = Math.max(existing.count, svg.count);
        }
      }
    }

    this.#loadSvgs(maxSvgs);

    // Si no encontramos el símbolo idle (no debería pasar), elegimos el primero.
    if (!this.#animationContainer || !this.#animationSymbol) {
      const firstAnim = Object.values(animations).find((a) => !!a) as LaBruteSymbol | undefined;
      if (firstAnim) {
        this.#animationSymbol = firstAnim;
        this.#frameCount = firstAnim.frames?.length ?? 0;
        const cont = this.container.children.find((c) => c.name === firstAnim.name);
        if (cont instanceof PIXI.Container) {
          cont.visible = true;
          this.#animationContainer = cont;
        }
      }
    }

    // Pintar primer frame
    this.#usedSvgs = {};
    this.#displayFrame(this.#animationContainer, this.#animationSymbol);

    // Tick loop
    this.#tickerCb = () => {
      if (this.#destroyed || this.container.destroyed) return;
      if (!this.#playing) return;

      // 30 fps base, ajustable con animationSpeed externo.
      const tickRate = 1000 / (30 * this.animationSpeed);

      this.#timer += app.ticker.elapsedMS;
      if (this.#timer === 0 || this.#timer >= tickRate) {
        this.#timer %= tickRate;

        const loopStart = LOOP_START[this.#model][this.animation] ?? null;
        if (this.#frame >= this.#frameCount && loopStart !== null) {
          this.#frame = loopStart;
        }

        // Hide all svgs y repintar
        for (const svg of this.#svgs) svg.visible = false;
        this.#usedSvgs = {};
        this.#displayFrame(this.#animationContainer, this.#animationSymbol);

        // Frame events (porteado de LaBrute): `:start` en frame 0, `:hit`/etc.
        // según `FRAME_EVENTS` del modelo+animación.
        if (this.#frame === 0) {
          this.#triggerEvent(`${this.animation}:start`);
        }
        const eventTable = FRAME_EVENTS[this.#model]?.[this.animation];
        if (eventTable) {
          const eventName = eventTable[this.#frame];
          if (eventName) {
            this.#triggerEvent(`${this.animation}:${eventName}`);
          }
        }

        this.#frame += 1;

        // Animación no looping: terminó.
        if (this.#frame >= this.#frameCount && loopStart === null) {
          this.#playing = false;
          this.#frame = Math.max(0, this.#frameCount - 1);
          this.#triggerEvent(`${this.animation}:end`);
          this.#resolvePending(`${this.animation}:end`);
          this.#resolvePending('any:end');
        }
      }
    };
    app.ticker.add(this.#tickerCb);
  }

  // ──────────────────────────── Public API ────────────────────────────

  setAnimation(name: AnimationName, frame = 0) {
    if (this.#destroyed) return;
    const symbol = ANIMATIONS[this.#model][name];
    if (!symbol) {
      // Animación no soportada por este modelo: fallback a idle.
      if (name !== 'idle') {
        this.setAnimation('idle');
      }
      return;
    }

    this.animation = name;

    // Hide all
    for (const child of this.container.children) {
      if (child !== this.shadow && child instanceof PIXI.Container) {
        child.visible = false;
      }
    }

    const targetName = symbol.name;
    const cont = this.container.children.find(
      (c) => c instanceof PIXI.Container && c.name === targetName,
    ) as PIXI.Container | undefined;

    if (!cont) {
      // No debería pasar.
      return;
    }
    cont.visible = true;
    this.#animationContainer = cont;
    this.#animationSymbol = symbol;
    this.#frame = frame;
    this.#frameCount = symbol.frames?.length ?? 0;
    this.#timer = 0;
    this.#playing = true;

    this.#usedSvgs = {};
    this.#displayFrame(this.#animationContainer, this.#animationSymbol);
  }

  /**
   * Reproduce una animación y resuelve cuando termina (animaciones one-shot)
   * o tras una vuelta completa (animaciones looping).
   */
  playAnimation(name: AnimationName): Promise<void> {
    return new Promise((resolve) => {
      if (this.#destroyed) {
        resolve();
        return;
      }

      const symbol = ANIMATIONS[this.#model][name];
      if (!symbol) {
        resolve();
        return;
      }

      this.setAnimation(name);

      const loopStart = LOOP_START[this.#model][name] ?? null;
      if (loopStart === null) {
        // One-shot: esperar al :end.
        this.#queuePending(`${name}:end`, resolve);
      } else {
        // Looping: esperar una vuelta completa.
        const frames = symbol.frames?.length ?? 0;
        const durationMs = (frames / 30) * 1000;
        setTimeout(() => resolve(), durationMs / Math.max(0.001, this.animationSpeed));
      }
    });
  }

  /**
   * Suscribirse a un evento de frame.
   * Eventos disponibles: `${animation}:start`, `${animation}:end`, y los
   * frame-events específicos del modelo (ver FRAME_EVENTS): `fist:hit`,
   * `slash:hit`, `estoc:hit`, `whip:hit`, `attack:hit`, `death:drop`,
   * `trash:trashed`, `win:hand-raised`.
   *
   * Retorna una función para des-suscribirse.
   */
  on(event: string, cb: (event: string) => void): () => void {
    let set = this.#listeners.get(event);
    if (!set) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(cb);
    return () => set!.delete(cb);
  }

  /** Igual a `on` pero se borra después de la primera ejecución. */
  once(event: string, cb: (event: string) => void): () => void {
    let set = this.#onceListeners.get(event);
    if (!set) {
      set = new Set();
      this.#onceListeners.set(event, set);
    }
    set.add(cb);
    return () => set!.delete(cb);
  }

  off(event: string, cb: (event: string) => void): void {
    this.#listeners.get(event)?.delete(cb);
    this.#onceListeners.get(event)?.delete(cb);
  }

  /** Dispara un evento; usado internamente por el ticker. */
  #triggerEvent(event: string): void {
    const persistent = this.#listeners.get(event);
    if (persistent) {
      for (const cb of persistent) cb(event);
    }
    const once = this.#onceListeners.get(event);
    if (once) {
      for (const cb of once) cb(event);
      this.#onceListeners.delete(event);
    }
  }

  /**
   * Cambia el arma visible en la mano del bruto.
   * Acepta el id snake_case del catálogo Brutus (`knife`, `axe`, etc.) o `null`
   * para no mostrar arma.
   */
  setWeapon(weaponId: string | null): void {
    const newFrame = weaponId ? (BRUTUS_TO_FRAME[weaponId] ?? 0) : 0;
    if (newFrame === this.#weaponFrame) return;
    this.#weaponFrame = newFrame;
    if (!this.#animationContainer || !this.#animationSymbol) return;
    // Reset COMPLETO del render: ocultar todos los sprites cargados y los
    // containers nested antes de re-evaluar el frame, así no queda estado
    // mezclado del frame anterior (sprites visibles que en el nuevo render
    // ya no participan).
    for (const sprite of this.#svgs) {
      if (!sprite.destroyed) sprite.visible = false;
    }
    this.#hideNestedContainers(this.#animationContainer);
    this.#usedSvgs = {};
    this.#displayFrame(this.#animationContainer, this.#animationSymbol);
  }

  /** Recursivamente esconde todos los Container anidados (no SVG). */
  #hideNestedContainers(root: PIXI.Container): void {
    for (const child of root.children) {
      if (child instanceof PIXI.Container && !(child instanceof PIXI.Sprite)) {
        child.visible = false;
        this.#hideNestedContainers(child);
      }
    }
  }

  /** Devuelve el id (en snake_case Brutus) del arma actualmente equipada o null. */
  getWeapon(): string | null {
    if (this.#weaponFrame === 0) return null;
    // Inversa rápida: busca la clave de BRUTUS_TO_FRAME que apunte al frame.
    for (const [k, v] of Object.entries(BRUTUS_TO_FRAME)) {
      if (v === this.#weaponFrame) return k;
    }
    return null;
  }

  setFacing(facing: 'left' | 'right') {
    if (this.#facing === facing) return;
    this.#facing = facing;
    // En LaBrute team='L' => +1 (mira a la derecha). Acá: 'right' => +1.
    this.container.scale.x = facing === 'right' ? 1 : -1;
  }

  get facing(): 'left' | 'right' {
    return this.#facing;
  }

  pause() {
    this.#playing = false;
  }

  play() {
    this.#playing = true;
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#playing = false;
    if (this.#tickerCb) {
      try {
        this.#app.ticker.remove(this.#tickerCb);
      } catch {
        // app already destroyed
      }
      this.#tickerCb = null;
    }
    // Resolver promesas pendientes para no dejar hangs.
    for (const resolvers of this.#pendingResolvers.values()) {
      for (const r of resolvers) r();
    }
    this.#pendingResolvers.clear();
    if (!this.container.destroyed) {
      this.container.destroy({ children: true });
    }
  }

  // ──────────────────────────── Internals ────────────────────────────

  #queuePending(key: string, resolver: () => void) {
    const list = this.#pendingResolvers.get(key) ?? [];
    list.push(resolver);
    this.#pendingResolvers.set(key, list);
  }

  #resolvePending(key: string) {
    const list = this.#pendingResolvers.get(key);
    if (!list) return;
    this.#pendingResolvers.delete(key);
    for (const r of list) r();
  }

  #initializeContainersAndGetSvgsToLoad = (
    svgsToLoad: SvgsToLoad,
    symbolContainer: PIXI.Container,
    parts: LaBruteSymbol['parts'],
    frame: FramePart[] = [],
  ) => {
    frame.forEach((framePart, i) => {
      const symbol = parts?.find((p) => p.name === framePart.name);
      if (!symbol) {
        // Ignorar parts faltantes en lugar de tirar — robustez para v3.
        return;
      }

      if (symbol.type === 'svg') {
        const existing = svgsToLoad.find((s) => s.svg.name === symbol.name);
        if (existing) existing.count++;
        else svgsToLoad.push({ svg: symbol, count: 1 });
      } else {
        const container = new PIXI.Container();
        container.sortableChildren = true;
        container.name = symbol.name;
        container.visible = false;
        container.zIndex = frame.length - i;
        symbolContainer.addChild(container);

        let framesToLoad: number[] = [];

        if (symbol.partIdx) {
          const partKey = symbol.partIdx.substring(1) as BruteBodyPart;
          const partValue = this.#parts[partKey];
          // Clamp defensivo: índice fuera de rango → frame 0 (en vez de no
          // renderizar y dejar huecos en el cuerpo).
          const numFrames = symbol.frames?.length ?? 0;
          if (partValue === undefined || partValue >= numFrames) {
            framesToLoad = [0];
          } else {
            framesToLoad = [partValue];
          }
        } else if (symbol.name === WEAPON_SYMBOL) {
          framesToLoad = WEAPON_FRAMES.map((_, idx) => idx);
        } else if (symbol.name === 'Symbol526') {
          framesToLoad = [16];
        } else {
          framesToLoad = [0];
        }

        for (const frameIdx of framesToLoad) {
          const currentFrame = symbol.frames?.[frameIdx];
          if (!currentFrame) continue;
          this.#initializeContainersAndGetSvgsToLoad(
            svgsToLoad,
            container,
            symbol.parts,
            currentFrame,
          );
        }
      }
    });
  };

  #loadSvgs = (svgsToLoad: SvgsToLoad) => {
    for (const svgToLoad of svgsToLoad) {
      const { svg } = svgToLoad;
      for (let i = 0; i < svgToLoad.count; i++) {
        const customScale = svg.scale ?? 1;
        const size = SCALE * this.#scale;

        const svgSprite = new PIXI.Sprite(
          Texture.from(`${svg.svg}<!-- ${size * customScale} -->`, {
            resourceOptions: { scale: size * customScale },
          }),
        );
        svgSprite.name = svg.name;
        svgSprite.scale.set(1 / customScale);
        svgSprite.visible = false;

        if (svg.offset) {
          svgSprite.x = -(svg.offset.x ?? 0) * size;
          svgSprite.y = -(svg.offset.y ?? 0) * size;
        }

        // Pantera: tint rosa/rojizo para distinguirla del lobo (LaBrute usa
        // los mismos Symbols 894/903 para ambos modelos; el tint hace la diff).
        if (this.#model === 'panther') {
          svgSprite.tint = 0xff8090;
        }

        this.container.addChild(svgSprite);
        this.#svgs.push(svgSprite);
      }
    }
  };

  #displayFrame = (
    symbolContainer: PIXI.Container | null,
    symbol: LaBruteSymbol | Svg | null,
    colorIdx?: string,
    zIndex?: number,
    svgMaskedBy?: number,
  ) => {
    if (!symbolContainer || !symbol) return;

    if (symbol.type === 'svg') {
      const sprite = this.#svgs
        .filter((s) => s.name === symbol.name)[this.#usedSvgs[symbol.name] ?? 0];

      if (!sprite) return;

      // Shield: siempre oculto (sin sistema de escudos en MVP).
      // Symbol39: oculto sólo si NO hay weapon (es la mano "vacía"; cuando hay
      // arma se muestra para sostener el sprite del weapon).
      if (sprite.name === SHIELD_SYMBOL) {
        sprite.visible = false;
      } else if (sprite.name === 'Symbol39') {
        sprite.visible = this.#weaponFrame > 0;
      } else {
        sprite.visible = true;
      }

      if (svgMaskedBy) {
        const maskSprite = this.#svgs.find((s) => s.name === `Symbol${svgMaskedBy}`);
        if (maskSprite) sprite.mask = maskSprite;
      }

      if (colorIdx) {
        const color = this.#colors[colorIdx.substring(1) as BruteColor];
        if (color) {
          sprite.tint = parseInt(color.replace('#', ''), 16);
        }
      }

      sprite.zIndex = zIndex ?? 0;
      symbolContainer.addChild(sprite);

      const usedCount = this.#usedSvgs[symbol.name];
      this.#usedSvgs[symbol.name] = usedCount ? usedCount + 1 : 1;
      return;
    }

    // Symbol (no svg)
    const usedSymbols: string[] = [];

    if (symbol.offset) {
      symbolContainer.x = this.#scale * SCALE * (symbol.offset.x ?? 0);
      symbolContainer.y = this.#scale * SCALE * (symbol.offset.y ?? 0);
    }

    let frameToLoad: number;

    if (symbol.partIdx) {
      const partKey = symbol.partIdx.substring(1) as BruteBodyPart;
      const partValue = this.#parts[partKey];
      const numFrames = symbol.frames?.length ?? 0;
      frameToLoad = (partValue !== undefined && partValue < numFrames) ? partValue : 0;
    } else if (symbol.name === WEAPON_SYMBOL) {
      frameToLoad = this.#weaponFrame;
    } else if (symbol.name === 'Symbol526') {
      frameToLoad = 16;
    } else if (ANIMATION_SYMBOL_NAMES[this.#model].includes(symbol.name)) {
      frameToLoad = this.#frame;
    } else {
      frameToLoad = 0;
    }

    const frameParts = symbol.frames?.[frameToLoad] ?? [];
    const usedContainers: Record<string, number> = {};

    for (let i = 0; i < frameParts.length; i++) {
      const framePart = frameParts[i];
      if (!framePart) continue;

      const identicCount = usedSymbols.filter((s) => s === framePart.name).length;
      const framePartSymbol = symbol.parts
        ?.filter((p) => p.name === framePart.name)[identicCount];
      if (!framePartSymbol) continue;

      if (framePartSymbol.type === 'svg') {
        this.#displayFrame(
          symbolContainer,
          framePartSymbol,
          colorIdx,
          frameParts.length - i,
          framePart.maskedBy,
        );
        continue;
      }

      const sameParts = symbolContainer.children.filter(
        (child) => child instanceof PIXI.Container && child.name === framePart.name,
      ).length;
      const framePartContainer = symbolContainer.children
        .filter((child) => child instanceof PIXI.Container && child.name === framePart.name)
      [sameParts - (usedContainers[framePart.name] ?? 0) - 1] as PIXI.Container | undefined;

      if (!framePartContainer) continue;

      if (framePart.transform) {
        const size = SCALE * this.#scale;
        framePartContainer.transform.setFromMatrix(
          matrixFromObject(framePart.transform, size),
        );
      }

      if (framePart.colorOffset) {
        framePartContainer.filters = [
          new Filter(undefined, ColorOffsetShader, {
            offset: new Float32Array([
              framePart.colorOffset.r ?? 0,
              framePart.colorOffset.g ?? 0,
              framePart.colorOffset.b ?? 0,
            ]),
            mult: new Float32Array([1, 1, 1]),
          }),
        ];
      }

      if (framePart.alpha) {
        framePartContainer.alpha = framePart.alpha;
      }

      if (framePart.maskedBy) {
        const maskSprite = this.#svgs.find((svg) => svg.name === `Symbol${framePart.maskedBy}`);
        if (maskSprite) framePartContainer.mask = maskSprite;
      }

      framePartContainer.visible = true;
      const usedCount = usedContainers[framePart.name];
      usedContainers[framePart.name] = usedCount ? usedCount + 1 : 1;

      this.#displayFrame(
        framePartContainer,
        framePartSymbol,
        framePartSymbol.colorIdx ?? colorIdx,
      );
    }
  };
}
