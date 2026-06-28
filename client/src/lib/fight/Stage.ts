// Stage Pixi para combates animados (v3).
// Cada bruto se renderiza con `FighterHolder` que reproduce las animaciones
// reales (idle/run/hit/death/...) usando los Symbols numerados de
// `labrute-fla-parser`. El movimiento entre posiciones lo seguimos haciendo
// con `pixi-tweener`, combinándolo con `setAnimation('run')`.

import * as PIXI from 'pixi.js';
import { Tweener, Easing } from 'pixi-tweener';
import {
  StepType,
  type FightLog,
  type FightFighter,
  type FightStep,
  type AttemptHitStep,
  type ArriveStep,
  type MoveStep,
  type HitStep,
  type EvadeStep,
  type BlockStep,
  type CounterStep,
  type DeathStep,
  type SurviveStep,
  type HealStep,
  type VampirismStep,
  type SkillActivateStep,
  type EquipStep,
  type EndStep,
} from 'core';

// Tipos locales para steps de core que el barrel todavía no re-exporta.
interface ThrowStep {
  a: StepType.Throw;
  f: number;
  t: number;
  w: string;
  k?: 1 | 0;
  r?: 1 | 0;
}
interface DisarmStep {
  a: StepType.Disarm;
  f: number;
  t: number;
  w: string;
}
interface TrashStep {
  a: StepType.Trash;
  b: number;
  w: string;
}
interface StealStep {
  a: StepType.Steal;
  b: number;
  t: number;
  w: string;
}
import FighterHolder, { type AnimationName } from '@/lib/fight/FighterHolder';
import { createLpcFightOverlay } from '@/lib/fight/lpcOverlay';
import {
  playSfx,
  playSkillSfx,
  playBgm,
  stopBgm,
  playWeaponHit,
  playPetHit,
  playBlockSfx,
} from '@/lib/fight/sounds';
import { throwWeaponSprite } from '@/lib/fight/thrownWeapon';
import { dropWeaponWithPhysics } from '@/lib/fight/droppedWeapon';
import {
  flashColor,
  glow,
  screenShake,
  floatingText,
  particles,
  motionBlur,
  goldFlash,
  bloodSplatter,
  dustCloud,
  souls,
  shockwave,
  expandingRings,
  bombSprite,
  explosion,
} from '@/lib/fight/effects';

// Tipos locales para steps que core/fight/types.ts define pero el barrel
// `core` aún no re-exporta. Mantenemos shape exacto; cuando core los
// re-exporte podemos cambiar a import.
interface BombStep {
  a: StepType.Bomb;
  f: number;
  t: number[];
  d: Record<string, number | undefined>;
}
interface HypnotiseStep {
  a: StepType.Hypnotise;
  b: number;
  t: number[];
  p: number[];
}

const ARENA_W = 800;
const ARENA_H = 360;
const GROUND_Y = 320;
const POS_LEFT_X = 220;
const POS_RIGHT_X = 580;
const ATTACK_OFFSET = 130;
const STEP_BASE_MS = 220;
const FIGHTER_SCALE = 1.8;
const PET_SCALE = 1.0;
const PET_OFFSET_X = 75;          // separación lateral del pet respecto al dueño
const PET_GAP = 38;               // separación entre pets del mismo dueño
/** Backgrounds disponibles en /images/game/resources/misc/background/. */
const BACKGROUND_COUNT = 13;

/** Cualquier id numérico (1, 2 = brutos; 11..23 = pets). */
type FighterId = number;

interface FighterRuntime {
  /** Id numérico (siempre presente; 1/2 para brutos, 11..23 para pets). */
  id: number;
  /** Nombre del fighter o pet, para HP bar. */
  name: string;
  /** Datos del fighter — solo presente para brutos. */
  fighter?: FightFighter;
  /** Datos del pet — solo presente para pets. */
  pet?: import('core').FightPet;
  display: FighterHolder;
  /** Container que se mueve por la arena (posición + transformaciones). */
  holder: PIXI.Container;
  homeX: number;
  facing: 'left' | 'right';
  alive: boolean;
  hp: number;
  maxHp: number;
  isPet: boolean;
  /** Container de la HP bar flotante (nombre + barra). */
  hpUi: PIXI.Container;
  hpBarFg: PIXI.Graphics;
  hpText: PIXI.Text;
  hpBarW: number;
  hpBarH: number;
  hpOffsetY: number;
}

const HP_BAR_W = 90;
const HP_BAR_H = 6;
const HP_BAR_OFFSET_Y = -200;
const PET_HP_BAR_W = 48;
const PET_HP_BAR_H = 4;
const PET_HP_OFFSET_Y = -90;

export interface StageOptions {
  view: HTMLDivElement;
  log: FightLog;
  /** Multiplicador de velocidad de las animaciones. 1 = normal. */
  speed?: number;
  onProgress?: (idx: number, total: number) => void;
  onComplete?: (winnerId: FighterId) => void;
  /** Notificación de cambio de HP — usado por las HP bars del header React. */
  onHpChange?: (fighterId: number, hp: number, maxHp: number) => void;
}

export class FightStage {
  private app: PIXI.Application;
  private stage: PIXI.Container;
  private fighters: Map<FighterId, FighterRuntime> = new Map();
  private playing = false;
  private skipped = false;
  private log: FightLog;
  private speed: number;
  private onProgress?: (idx: number, total: number) => void;
  private onComplete?: (winnerId: FighterId) => void;
  private onHpChange?: (fighterId: number, hp: number, maxHp: number) => void;
  private destroyed = false;
  private viewParent: HTMLDivElement;

  constructor(opts: StageOptions) {
    this.log = opts.log;
    this.speed = opts.speed ?? 1;
    this.onProgress = opts.onProgress;
    this.onHpChange = opts.onHpChange;
    this.onComplete = opts.onComplete;
    this.viewParent = opts.view;

    this.app = new PIXI.Application({
      width: ARENA_W,
      height: ARENA_H,
      backgroundColor: 0x0b0610,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    Tweener.init(this.app.ticker);

    const canvas = this.app.view as HTMLCanvasElement;
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.borderRadius = '6px';
    this.viewParent.appendChild(canvas);

    this.stage = this.app.stage;
    this.stage.sortableChildren = true;

    this.drawBackground();
    this.setupFighters();
  }

  private drawBackground() {
    // Elegimos un background pseudo-aleatorio determinístico desde el log
    // (mismo combate → mismo fondo). Usamos fighters[0].id como semilla.
    const seed = (this.log.fighters[0]?.bruteId ?? 'x').charCodeAt(0) || 1;
    const idx = (seed % BACKGROUND_COUNT) + 1;
    const url = `/images/game/resources/misc/background/${idx}.jpg`;

    // Placeholder gradient mientras la imagen carga (o si falla).
    // Color matchea var(--bg-light) para coherencia con el resto del UI.
    const placeholder = new PIXI.Graphics();
    placeholder.beginFill(0x1f1530);
    placeholder.drawRect(0, 0, ARENA_W, ARENA_H);
    placeholder.endFill();
    placeholder.zIndex = -10;
    this.stage.addChild(placeholder);

    // Carga via <img> nativo para garantizar que tenemos width/height antes
    // de mostrar el sprite. Pixi v6 a veces no dispara 'loaded' como esperamos.
    const img = new Image();
    img.src = url;
    const sprite = new PIXI.Sprite();
    sprite.zIndex = -5;
    sprite.alpha = 0;
    this.stage.addChild(sprite);
    img.onload = () => {
      if (this.destroyed) return;
      const tex = PIXI.Texture.from(img);
      sprite.texture = tex;
      const tw = img.naturalWidth || 500;
      const th = img.naturalHeight || 320;
      const scale = Math.max(ARENA_W / tw, ARENA_H / th);
      sprite.scale.set(scale);
      sprite.x = (ARENA_W - tw * scale) / 2;
      sprite.y = (ARENA_H - th * scale) / 2;
      sprite.alpha = 1;
    };
    img.onerror = () => {
      // Si el background falla, dejamos solo el placeholder gradient.
    };

    // Sombra / vignette inferior para destacar a los fighters.
    const vignette = new PIXI.Graphics();
    vignette.beginFill(0x000000, 0.35);
    vignette.drawRect(0, GROUND_Y - 8, ARENA_W, ARENA_H - GROUND_Y + 8);
    vignette.endFill();
    vignette.zIndex = -1;
    this.stage.addChild(vignette);
  }

  private setupFighters() {
    const [a, b] = this.log.fighters;
    this.spawnFighter(a, POS_LEFT_X, 'right');
    this.spawnFighter(b, POS_RIGHT_X, 'left');

    // Spawn pets (si los hay).
    const pets = this.log.pets ?? [];
    let leftSlot = 0;
    let rightSlot = 0;
    for (const pet of pets) {
      const isLeft = pet.side === 'left';
      const slot = isLeft ? leftSlot++ : rightSlot++;
      const ownerX = isLeft ? POS_LEFT_X : POS_RIGHT_X;
      const facing: 'left' | 'right' = isLeft ? 'right' : 'left';
      // Los pets se ubican detrás del bruto dueño con offset lateral.
      const directionAway = isLeft ? -1 : 1;
      const x = ownerX + directionAway * (PET_OFFSET_X + slot * PET_GAP);
      this.spawnPet(pet, x, facing);
    }
  }

  private spawnFighter(f: FightFighter, x: number, facing: 'left' | 'right') {
    const display = new FighterHolder(this.app, {
      gender: f.gender,
      body: f.body,
      bodyColors: f.bodyColors,
      model: 'brute',
      scale: FIGHTER_SCALE,
    });
    display.setFacing(facing);

    // Arma inicial: el primer step Arrive del log también la setea, pero
    // anticipamos para que el spawn ya tenga el sprite correcto.
    const initialWeapon = this.findInitialWeapon(f.id);
    if (initialWeapon) display.setWeapon(initialWeapon);

    const holder = new PIXI.Container();
    // Spawn offscreen para la animación de "arrive": los brutos entran
    // corriendo desde fuera del canvas. La animación real al home se hace en
    // playArrives() antes del primer step del log.
    holder.x = facing === 'right' ? -150 : ARENA_W + 150;
    holder.y = GROUND_Y;
    holder.addChild(display.container);
    if (f.lpc) {
      // El FighterHolder clásico sigue existiendo solo para timing/frame events,
      // pero no debe pintarse nunca detrás del LPC.
      display.container.visible = false;
      display.container.renderable = false;
      display.container.alpha = 0;
      const lpcOverlay = createLpcFightOverlay(this.app, f.lpc, facing);
      holder.addChild(lpcOverlay);
      const setClassicAnimation = display.setAnimation.bind(display);
      display.setAnimation = (name: AnimationName) => {
        lpcOverlay.setLpcAnimation(name);
        return setClassicAnimation(name);
      };
      const playClassicAnimation = display.playAnimation.bind(display);
      display.playAnimation = (name: AnimationName) => {
        void lpcOverlay.playLpcAnimation(name);
        return playClassicAnimation(name);
      };
    }
    this.stage.addChild(holder);

    // HP bar flotante sobre el bruto.
    const hpUi = new PIXI.Container();
    hpUi.x = x;
    hpUi.y = GROUND_Y + HP_BAR_OFFSET_Y;
    hpUi.zIndex = 50;

    const hpText = new PIXI.Text(`${f.name}  ${f.maxHp}`, {
      fontFamily: 'Cinzel, serif',
      fontSize: 13,
      fill: 0xeae0d2,
      stroke: 0x0b0610,
      strokeThickness: 3,
      align: 'center',
    });
    hpText.anchor.set(0.5, 1);
    hpText.y = -HP_BAR_H / 2 - 4;
    hpUi.addChild(hpText);

    const hpBarBg = new PIXI.Graphics();
    hpBarBg.beginFill(0x0b0610, 0.85);
    hpBarBg.lineStyle(1, 0xc9a449, 0.7);
    hpBarBg.drawRoundedRect(-HP_BAR_W / 2, -HP_BAR_H / 2, HP_BAR_W, HP_BAR_H, 2);
    hpBarBg.endFill();
    hpUi.addChild(hpBarBg);

    const hpBarFg = new PIXI.Graphics();
    drawHpFill(hpBarFg, 1);
    hpUi.addChild(hpBarFg);

    this.stage.addChild(hpUi);
    // Las HP bars de brutos viven en el header React (FightViewer); las
    // flotantes Pixi se mantienen para applyHpDelta interno pero ocultas.
    hpUi.visible = false;

    const runtime: FighterRuntime = {
      id: f.id,
      name: f.name,
      fighter: f,
      display,
      holder,
      hp: f.maxHp,
      maxHp: f.maxHp,
      isPet: false,
      hpUi,
      hpBarFg,
      hpText,
      hpBarW: HP_BAR_W,
      hpBarH: HP_BAR_H,
      hpOffsetY: HP_BAR_OFFSET_Y,
      homeX: x,
      facing,
      alive: true,
    };
    this.fighters.set(f.id as FighterId, runtime);

    // Idle al spawnear (FighterHolder ya empieza en idle, pero por las dudas).
    display.setAnimation('idle');

    // Sincronizar HP bar con la posición del holder en cada tick.
    this.app.ticker.add(() => {
      hpUi.x = holder.x;
      hpUi.y = holder.y + HP_BAR_OFFSET_Y;
    });
  }

  /** Spawn de un pet (lobo/oso/pantera). Versión reducida del spawnFighter. */
  private spawnPet(p: import('core').FightPet, x: number, facing: 'left' | 'right') {
    const display = new FighterHolder(this.app, {
      model: p.model,
      scale: PET_SCALE,
    });
    display.setFacing(facing);

    const holder = new PIXI.Container();
    holder.x = x;
    holder.y = GROUND_Y;
    holder.addChild(display.container);
    this.stage.addChild(holder);

    // HP bar flotante mini.
    const hpUi = new PIXI.Container();
    hpUi.x = x;
    hpUi.y = GROUND_Y + PET_HP_OFFSET_Y;
    hpUi.zIndex = 49;

    const hpText = new PIXI.Text(`${p.name}`, {
      fontFamily: 'AcmeSa, sans-serif',
      fontSize: 10,
      fill: 0xeae0d2,
      stroke: 0x0b0610,
      strokeThickness: 2,
      align: 'center',
    });
    hpText.anchor.set(0.5, 1);
    hpText.y = -PET_HP_BAR_H / 2 - 3;
    hpUi.addChild(hpText);

    const hpBarBg = new PIXI.Graphics();
    hpBarBg.beginFill(0x0b0610, 0.85);
    hpBarBg.lineStyle(1, 0xc9a449, 0.6);
    hpBarBg.drawRoundedRect(-PET_HP_BAR_W / 2, -PET_HP_BAR_H / 2, PET_HP_BAR_W, PET_HP_BAR_H, 1);
    hpBarBg.endFill();
    hpUi.addChild(hpBarBg);

    const hpBarFg = new PIXI.Graphics();
    drawHpFillSized(hpBarFg, 1, PET_HP_BAR_W, PET_HP_BAR_H);
    hpUi.addChild(hpBarFg);

    this.stage.addChild(hpUi);

    const runtime: FighterRuntime = {
      id: p.id,
      name: p.name,
      pet: p,
      display,
      holder,
      hp: p.maxHp,
      maxHp: p.maxHp,
      isPet: true,
      hpUi,
      hpBarFg,
      hpText,
      hpBarW: PET_HP_BAR_W,
      hpBarH: PET_HP_BAR_H,
      hpOffsetY: PET_HP_OFFSET_Y,
      homeX: x,
      facing,
      alive: true,
    };
    this.fighters.set(p.id, runtime);

    display.setAnimation('idle');

    this.app.ticker.add(() => {
      hpUi.x = holder.x;
      hpUi.y = holder.y + PET_HP_OFFSET_Y;
    });
  }

  /** Busca el primer ArriveStep del log para este fighter y devuelve su `w`. */
  private findInitialWeapon(fighterId: number): string | null {
    for (const step of this.log.steps) {
      if (step.a === StepType.Arrive && step.f === fighterId) {
        return step.w ?? null;
      }
    }
    return null;
  }

  /**
   * Animación de entrada: todos los brutos y pets corren desde offscreen
   * hacia su home position. Se ejecuta UNA VEZ al inicio del combate, antes
   * de procesar steps. Los Arrive steps del log después se vuelven no-op
   * (animArrive lo skippea si ya están en home).
   */
  private async playArrives(): Promise<void> {
    if (this.skipped || this.destroyed) return;
    playSfx('arrive');
    const arriving: Promise<void>[] = [];
    for (const r of this.fighters.values()) {
      // Si ya está en home (skip / replay), no animar.
      if (r.holder.x === r.homeX) continue;
      r.display.setAnimation('run');
      const tween = Tweener.add(
        {
          target: r.holder,
          duration: 0.55 / this.speed,
          ease: Easing.easeOutQuad,
        },
        { x: r.homeX },
      ).then(() => {
        if (this.destroyed) return;
        r.display.setAnimation('idle');
      });
      arriving.push(tween);
    }
    await Promise.all(arriving);
  }

  /** Fija la HP absoluta de un fighter/pet, actualiza barra, texto y devuelve la HP nueva. */
  private setHp(id: FighterId, hp: number): number {
    const r = this.fighters.get(id);
    if (!r) return 0;
    const newHp = Math.max(0, Math.min(r.maxHp, hp));
    r.hp = newHp;
    const pct = r.maxHp > 0 ? newHp / r.maxHp : 0;
    drawHpFillSized(r.hpBarFg, pct, r.hpBarW, r.hpBarH);
    const label = r.isPet ? r.pet?.name ?? '' : r.fighter?.name ?? '';
    r.hpText.text = r.isPet ? `${label}` : `${label}  ${newHp}`;
    this.onHpChange?.(Number(id), newHp, r.maxHp);
    return newHp;
  }

  /** Aplica daño/heal a un fighter (o pet), actualiza la HP bar y devuelve la HP nueva. */
  private applyHpDelta(id: FighterId, delta: number): number {
    const r = this.fighters.get(id);
    if (!r) return 0;
    return this.setHp(id, r.hp + delta);
  }

  private async forceDeath(id: FighterId): Promise<void> {
    const f = this.fighters.get(id);
    if (!f || !f.alive) return;
    f.alive = false;
    f.hp = 0;
    drawHpFillSized(f.hpBarFg, 0, f.hpBarW, f.hpBarH);
    const label = f.isPet ? f.pet?.name ?? '' : f.fighter?.name ?? '';
    f.hpText.text = f.isPet ? `${label}` : `${label}  0`;
    this.onHpChange?.(id, 0, f.maxHp);
    f.display.setAnimation('death');
    dustCloud(this.stage, f.holder.x, f.holder.y - 6, { count: 8, spread: 40 });
    await this.awaitFrameEvent(f.display, 'death:drop', 550);
    playSfx('lose');
    souls(this.stage, f.holder.x, f.holder.y - f.display.baseHeight * 0.5);
    await Tweener.add(
      {
        target: f.holder,
        duration: 0.35 / this.speed,
        ease: Easing.easeOutQuad,
      },
      { alpha: 0.45 },
    );
  }

  async play(): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    // Música de fondo en loop durante todo el combate.
    playBgm('bg');
    // Animación de entrada: los brutos corren desde offscreen hasta su home.
    // Pets siguen al dueño con un offset.
    await this.playArrives();
    const total = this.log.steps.length;
    for (let i = 0; i < total; i++) {
      if (this.destroyed) return;
      if (this.skipped) break;
      const step = this.log.steps[i]!;
      this.onProgress?.(i, total);
      await this.dispatch(step);
      if (step.a !== StepType.End && [...this.fighters.values()].some((f) => !f.isPet && f.hp <= 0)) {
        break;
      }
    }
    this.playing = false;
    if (this.skipped || this.destroyed) return;
    const endStep = this.log.steps.find((s): s is EndStep => s.a === StepType.End);
    if (endStep) {
      const winner = this.fighters.get(endStep.w as FighterId);
      if (winner) {
        playSfx('win');
        // No esperamos: la promesa de win loop puede no resolver si no hay loop.
        void winner.display.playAnimation('win');
      }
      this.onComplete?.(endStep.w as FighterId);
      return;
    }

    // Failsafe: una pelea jamás debe quedarse sin final si el log llega sin End.
    const alive = [...this.fighters.values()].filter((f) => !f.isPet && f.hp > 0);
    const winner = alive.sort((a, b) => b.hp - a.hp)[0];
    if (winner) {
      playSfx('win');
      void winner.display.playAnimation('win');
      this.onComplete?.(winner.id as FighterId);
    }
  }

  skip() {
    this.skipped = true;
    Tweener.dispose();
    const endStep = this.log.steps.find((s): s is EndStep => s.a === StepType.End);
    if (endStep) {
      const winnerId = endStep.w as FighterId;
      const loserId = endStep.l as FighterId;
      const loser = this.fighters.get(loserId);
      if (loser) {
        loser.holder.alpha = 0.4;
        loser.display.setAnimation('death');
        loser.alive = false;
      }
      this.onComplete?.(winnerId);
    }
  }

  destroy() {
    this.destroyed = true;
    stopBgm();
    Tweener.dispose();
    for (const r of this.fighters.values()) {
      r.display.destroy();
    }
    this.fighters.clear();
    try {
      this.app.destroy(true, { children: true });
    } catch {
      // app already destroyed
    }
  }

  // ────────────────────────── Dispatcher ──────────────────────────

  private async dispatch(step: FightStep): Promise<void> {
    switch (step.a) {
      case StepType.Arrive:
        return this.animArrive(step);
      case StepType.Move:
        return this.animMove(step);
      case StepType.MoveBack:
        return this.animMoveBack(step.f as FighterId);
      case StepType.AttemptHit:
        return this.animAttempt(step);
      case StepType.Hit:
      case StepType.FlashFlood:
      case StepType.Hammer:
      case StepType.Poison:
        return this.animHit(step as HitStep);
      case StepType.Bomb:
        return this.animBomb(step as unknown as BombStep);
      case StepType.Hypnotise:
        return this.animHypnotise(step as unknown as HypnotiseStep);
      case StepType.Evade:
        return this.animEvade(step);
      case StepType.Block:
        return this.animBlock(step);
      case StepType.Counter:
        return this.animCounter(step);
      case StepType.Death:
        return this.animDeath(step);
      case StepType.Survive:
        return this.animSurvive(step);
      case StepType.Heal:
        return this.animHeal(step);
      case StepType.Vampirism:
        return this.animVampirism(step);
      case StepType.SkillActivate:
        return this.animSkill(step);
      case StepType.Equip:
        return this.animEquip(step);
      case StepType.Throw:
        return this.animThrow(step as unknown as ThrowStep);
      case StepType.Disarm:
        return this.animDisarm(step as unknown as DisarmStep);
      case StepType.Trash:
        return this.animTrash(step as unknown as TrashStep);
      case StepType.Steal:
        return this.animSteal(step as unknown as StealStep);
      case StepType.End:
        return this.wait(STEP_BASE_MS);
      default:
        return this.wait(50);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms / this.speed));
  }

  /**
   * Espera a que el FighterHolder emita un frame event (ej `'throw:launch'`)
   * o, si no lo hace dentro de `fallbackMs`, resuelve igual. Usado para
   * sincronizar SFX al frame visual exacto sin colgar si la animación
   * cambia o no llega al frame.
   */
  private awaitFrameEvent(
    display: FighterHolder,
    event: string,
    fallbackMs: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      let resolved = false;
      const off = display.once(event, () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        resolve();
      });
      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        off();
        resolve();
      }, fallbackMs / this.speed);
    });
  }

  private get(id: number): FighterRuntime | undefined {
    return this.fighters.get(id as FighterId);
  }

  /** Elige una hit-X para la animación de golpe. */
  private pickHitAnim(): AnimationName {
    const idx = Math.floor(Math.random() * 3);
    return (['hit-0', 'hit-1', 'hit-2'] as const)[idx]!;
  }

  // ───────────────────────── Animadores ──────────────────────────

  private async animArrive(step: ArriveStep) {
    const f = this.get(step.f);
    if (!f) return this.wait(0);
    // playArrives() ya hizo entrar al bruto desde offscreen al inicio del
    // combate. El step Arrive del log es solo para mantener el weapon inicial
    // sincronizado y no genera animación adicional.
    if (step.w !== undefined) {
      f.display.setWeapon(step.w);
    }
    return this.wait(0);
  }

  private async animMove(step: MoveStep) {
    const f = this.get(step.f);
    const t = this.get(step.t);
    if (!f || !t || !f.alive || !t.alive) return;
    const targetX = t.holder.x + (t.facing === 'left' ? -ATTACK_OFFSET : ATTACK_OFFSET);
    f.display.setAnimation('run');
    dustCloud(this.stage, f.holder.x, f.holder.y - 8, { count: 4, spread: 20 });
    await Tweener.add(
      { target: f.holder, duration: 0.25 / this.speed, ease: Easing.easeOutQuad },
      { x: targetX },
    );
    if (f.alive) f.display.setAnimation('idle');
  }

  private async animMoveBack(id: FighterId) {
    const f = this.get(id);
    if (!f || !f.alive) return;
    f.display.setAnimation('run');
    dustCloud(this.stage, f.holder.x, f.holder.y - 8, { count: 3, spread: 18 });
    await Tweener.add(
      { target: f.holder, duration: 0.25 / this.speed, ease: Easing.easeOutQuad },
      { x: f.homeX },
    );
    if (f.alive) f.display.setAnimation('idle');
  }

  /**
   * AttemptHit: solo windup leve. La animación de ataque y el SFX/damage
   * sincronizados con el frame de impacto se manejan en `animHit`.
   */
  private async animAttempt(_step: AttemptHitStep) {
    // Pequeño wait para separar visualmente el move/attempt del hit real.
    await this.wait(60);
  }

  /**
   * Hit: el SFX, daño visual, floating text y knockback se disparan **en el
   * frame de impacto** de la animación del atacante (evento `:hit`), no al
   * inicio del step. Esto da la sensación correcta de "el puño/arma toca al
   * oponente y AHÍ suena/duele".
   */
  private async animHit(step: HitStep) {
    const target = this.get(step.t);
    const attacker = this.get(step.f);
    if (!target || !attacker || !target.alive || !attacker.alive) return;

    const dmgPct = Math.min(0.6, step.d / Math.max(1, target.maxHp));
    const knockback = 18 + 30 * dmgPct;
    const isCrit = step.c === 1;
    const dmgColor = isCrit ? 0xffaa00 : 0xff3344;
    const dmgLabel = isCrit ? `-${step.d}!` : `-${step.d}`;

    // Elegir animación del attacker según el arma. fist=puños, slash=blade,
    // estoc=lance/thrown, whip=látigo. Los pets usan 'attack'.
    const attackAnim = this.pickAttackAnim(attacker, step.w);

    // Lanzar la animación del attacker (sin esperar).
    void attacker.display.playAnimation(attackAnim).then(() => {
      if (!this.destroyed && attacker.alive) attacker.display.setAnimation('idle');
    });

    // Esperar el frame de impacto (o timeout de seguridad si nunca llega).
    await this.awaitFrameEvent(attacker.display, `${attackAnim}:hit`, 600);

    // ---- IMPACTO (sincronizado con el frame) ----
    const targetHp = typeof step.hp === 'number'
      ? this.setHp(target.id as FighterId, step.hp)
      : this.applyHpDelta(target.id as FighterId, -step.d);
    if (attacker.isPet) {
      playPetHit(attacker.pet?.model ?? 'dog');
    } else {
      playWeaponHit(step.w);
    }
    void floatingText(
      this.stage,
      target.holder.x,
      target.holder.y - target.display.baseHeight + 10,
      dmgLabel,
      dmgColor,
    );
    if (isCrit) {
      void screenShake(this.stage, 6, 200);
      bloodSplatter(
        this.stage,
        target.holder.x,
        target.holder.y - target.display.baseHeight * 0.45,
        1.5,
      );
    }

    if (targetHp <= 0) {
      await this.forceDeath(target.id as FighterId);
      await this.animMoveBack(attacker.id as FighterId);
      return;
    }

    void target.display.playAnimation(this.pickHitAnim()).then(() => {
      if (!this.destroyed && target.alive) target.display.setAnimation('idle');
    });

    // Knockback + retorno.
    await Tweener.add(
      {
        target: target.holder,
        duration: 0.12 / this.speed,
        ease: Easing.easeOutQuad,
      },
      { x: target.holder.x + (target.facing === 'left' ? knockback : -knockback) },
    );
    await Tweener.add(
      {
        target: target.holder,
        duration: 0.18 / this.speed,
        ease: Easing.easeOutQuad,
      },
      { x: target.homeX },
    );

    await this.animMoveBack(attacker.id as FighterId);
  }

  /** Decide la animación de ataque según pet o arma equipada. */
  private pickAttackAnim(
    attacker: FighterRuntime,
    weaponId?: string,
  ): AnimationName {
    if (attacker.isPet) return 'attack';
    if (!weaponId) return 'fist';
    // Heurística: blade → slash; long/thrown → estoc; whip → whip; otros → fist.
    const slash = ['knife', 'dagger', 'axe', 'hatchet', 'scimitar', 'broadsword', 'katana', 'claymore', 'rapier', 'sai', 'shuriken', 'fan'];
    const estoc = ['lance', 'halberd', 'trident'];
    const whip = ['whip', 'chain_whip', 'nunchaku', 'flail'];
    if (slash.includes(weaponId)) return 'slash';
    if (estoc.includes(weaponId)) return 'estoc';
    if (whip.includes(weaponId)) return 'whip';
    return 'fist';
  }

  private async animEvade(step: EvadeStep) {
    const f = this.get(step.f);
    if (!f) return;
    void f.display.playAnimation('evade').then(() => {
      if (!this.destroyed && f.alive) f.display.setAnimation('idle');
    });
    // SFX sincronizado al frame de la esquiva.
    await this.awaitFrameEvent(f.display, 'evade:dodge', 100);
    playSfx('evade');
    const origY = f.holder.y;
    await Tweener.add(
      { target: f.holder, duration: 0.12 / this.speed, ease: Easing.easeOutQuad },
      { y: origY - 28 },
    );
    await Tweener.add(
      { target: f.holder, duration: 0.12 / this.speed, ease: Easing.easeInQuad },
      { y: origY },
    );
    const other = [...this.fighters.values()].find((r) => r.id !== step.f);
    if (other) {
      await this.animMoveBack(other.id as FighterId);
    }
  }

  private async animBlock(step: BlockStep) {
    const f = this.get(step.f);
    if (!f) return;
    void f.display.playAnimation('block').then(() => {
      if (!this.destroyed && f.alive) f.display.setAnimation('idle');
    });
    // SFX sincronizado al frame de la pose de bloqueo. Random entre 4 variantes.
    await this.awaitFrameEvent(f.display, 'block:pose', 150);
    playBlockSfx();
    await this.wait(180);
    const other = [...this.fighters.values()].find((r) => r.id !== step.f);
    if (other) await this.animMoveBack(other.id as FighterId);
  }

  private async animCounter(step: CounterStep) {
    const f = this.get(step.f);
    const t = this.get(step.t);
    if (!f || !t || !f.alive || !t.alive) return;
    const targetX = t.holder.x + (t.facing === 'left' ? -ATTACK_OFFSET : ATTACK_OFFSET);
    f.display.setAnimation('run');
    await Tweener.add(
      { target: f.holder, duration: 0.15 / this.speed, ease: Easing.easeOutQuad },
      { x: targetX },
    );
    if (f.alive) f.display.setAnimation('idle');
    await this.animMoveBack(f.id as FighterId);
  }

  private async animDeath(step: DeathStep) {
    await this.forceDeath(step.f as FighterId);
  }

  private async animSurvive(step: SurviveStep) {
    const f = this.get(step.b);
    if (!f) return this.wait(220);
    void glow(f.display.container, 0xffd84a, 500);
    void goldFlash(f.display.container, 280);
    void floatingText(
      this.stage,
      f.holder.x,
      f.holder.y - f.display.baseHeight + 10,
      '¡Sobrevive!',
      0xffe066,
    );
    return this.wait(260);
  }

  private async animHeal(step: HealStep) {
    const f = this.get(step.b);
    if (!f) return this.wait(180);
    if (typeof step.hp === 'number') {
      this.setHp(step.b as FighterId, step.hp);
    } else {
      this.applyHpDelta(step.b as FighterId, step.h);
    }
    void glow(f.display.container, 0x4ade80, 480);
    void floatingText(
      this.stage,
      f.holder.x,
      f.holder.y - f.display.baseHeight + 10,
      `+${step.h} HP`,
      0x4ade80,
    );
    return this.wait(220);
  }

  private async animVampirism(step: VampirismStep) {
    const attacker = this.get(step.b);
    if (!attacker) return this.wait(180);
    if (typeof step.hp === 'number') {
      this.setHp(step.b as FighterId, step.hp);
    } else {
      this.applyHpDelta(step.b as FighterId, step.h);
    }
    void glow(attacker.display.container, 0xb91c1c, 480);
    void floatingText(
      this.stage,
      attacker.holder.x,
      attacker.holder.y - attacker.display.baseHeight + 10,
      `+${step.h} HP`,
      0x4ade80,
    );
    return this.wait(220);
  }

  private async animBomb(step: BombStep) {
    playSkillSfx('bomb');

    const attacker = this.get(step.f);
    const fromX = attacker?.holder.x ?? ARENA_W / 2;
    const fromY = (attacker?.holder.y ?? GROUND_Y) - (attacker?.display.baseHeight ?? 200) * 0.4;

    // Lanzar una bomba a cada target en arco; cuando llega, explota.
    const bombPromises: Promise<void>[] = [];
    for (const tid of step.t) {
      const tgt = this.get(tid);
      if (!tgt) continue;
      const cx = tgt.holder.x;
      const cy = tgt.holder.y - tgt.display.baseHeight * 0.4;
      const p = bombSprite(
        this.stage,
        { x: fromX, y: fromY },
        { x: cx, y: cy },
        this.speed,
      ).then(() => {
        if (this.destroyed) return;
        explosion(this.stage, cx, cy, 110);
        playSfx('hit_blunt');
        // Daño flotante por target si lo tenemos. (HP delta lo aplica el Hit
        // step que el engine emite por separado para bombas.)
        const d = step.d[String(tid)];
        if (typeof d === 'number') {
          void floatingText(this.stage, cx, cy, `-${d}`, 0xff3344);
        }
      });
      bombPromises.push(p);
    }

    // Esperar a que todas las bombas lleguen, luego shake fuerte.
    await Promise.all(bombPromises);
    void screenShake(this.stage, 9, 320);
    return this.wait(220);
  }

  private async animHypnotise(step: HypnotiseStep) {
    playSkillSfx('cry_of_the_damned'); // sin SFX dedicado de hipnosis: cry mapea a cry.
    const actor = this.get(step.b);
    if (!actor) return this.wait(220);

    // 3 anillos morados concéntricos escalonados, irradiando del hipnotizador.
    const cx = actor.holder.x;
    const cy = actor.holder.y - actor.display.baseHeight * 0.45;
    expandingRings(this.stage, cx, cy, 3, 0x9333ea, 110, 100);

    void glow(actor.display.container, 0x9333ea, 540);
    void floatingText(
      this.stage,
      actor.holder.x,
      actor.holder.y - actor.display.baseHeight + 10,
      'Hipnosis',
      0xc084fc,
    );

    // Glow morado en cada target hipnotizado.
    for (const tid of step.t) {
      const tgt = this.get(tid);
      if (!tgt) continue;
      void glow(tgt.display.container, 0xa855f7, 480);
    }
    return this.wait(420);
  }

  private async animSkill(step: SkillActivateStep) {
    playSkillSfx(step.s);
    const actor = this.get(step.b);
    if (!actor) return this.wait(220);

    const target = actor.display.container;
    const head = actor.holder.y - actor.display.baseHeight + 10;

    switch (step.s) {
      case 'hammer': {
        // Onda de impacto morada + screenshake fuerte + texto "MARTILLAZO".
        void shockwave(this.stage, actor.holder.x, actor.holder.y - 20, 0x9333ea, 140);
        void glow(target, 0x9333ea, 460);
        void screenShake(this.stage, 8, 320);
        void floatingText(this.stage, actor.holder.x, head, '¡MARTILLAZO!', 0xff5060);
        return this.wait(320);
      }
      case 'bomb': {
        // Fallback si no hay BombStep posterior — explosión en la posición.
        const ex = actor.holder.x;
        const ey = actor.holder.y - actor.display.baseHeight * 0.4;
        explosion(this.stage, ex, ey, 100);
        void screenShake(this.stage, 8, 280);
        return this.wait(280);
      }
      case 'cry_of_the_damned': {
        // Anillos morados concéntricos amplios irradiando.
        const cx = actor.holder.x;
        const cy = actor.holder.y - actor.display.baseHeight * 0.45;
        expandingRings(this.stage, cx, cy, 4, 0x7c3aed, 130, 160);
        void glow(target, 0x7c3aed, 540);
        void screenShake(this.stage, 3, 220);
        return this.wait(380);
      }
      case 'fierce_brute': {
        // Aura roja explosiva + onda roja.
        void shockwave(this.stage, actor.holder.x, actor.holder.y - 20, 0xdc2626, 110);
        void glow(target, 0xdc2626, 540);
        void flashColor(target, 0xff2a2a, 320);
        void floatingText(this.stage, actor.holder.x, head, '¡Furia!', 0xff5060);
        return this.wait(320);
      }
      case 'swift_wind':
      case 'haste': {
        void motionBlur(target, 18, 420);
        void glow(target, 0x60a5fa, 360);
        return this.wait(220);
      }
      case 'net': {
        // Targets opcional via step.p.
        const targets = step.p ?? [];
        for (const tid of targets) {
          const tgt = this.get(tid);
          if (!tgt) continue;
          particles(this.stage, tgt.holder.x, tgt.holder.y - tgt.display.baseHeight * 0.5, {
            count: 16,
            color: 0xc0c0c0,
            life: 520,
            spread: 40,
          });
        }
        if (targets.length === 0) {
          particles(this.stage, actor.holder.x, head, {
            count: 12,
            color: 0xc0c0c0,
            life: 520,
            spread: 40,
          });
        }
        return this.wait(260);
      }
      case 'tragic_potion': {
        void glow(target, 0x4ade80, 460);
        void floatingText(this.stage, actor.holder.x, head, '+HP', 0x4ade80);
        return this.wait(260);
      }
      case 'iron_skin': {
        void glow(target, 0xc0c0c0, 480);
        return this.wait(240);
      }
      case 'martial_arts':
      default: {
        void goldFlash(target, 220);
        void glow(target, 0xffd84a, 360);
        dustCloud(this.stage, actor.holder.x, actor.holder.y - 6, { count: 4, spread: 22 });
        return this.wait(220);
      }
    }
  }

  private async animEquip(step: EquipStep) {
    const f = this.get(step.b);
    if (!f) return this.wait(120);
    f.display.setWeapon(step.w);
    playSfx('equip');
    void goldFlash(f.display.container, 200);
    return this.wait(160);
  }

  private async animThrow(step: ThrowStep) {
    const f = this.get(step.f);
    const t = this.get(step.t);
    if (!f) return this.wait(120);

    // Defensivo para QA: warns si el step viene incompleto, así si el bug
    // de "throw mid-fight no muestra proyectil" reaparece, queda log claro.
    if (!step.w) {
      // eslint-disable-next-line no-console
      console.warn('[animThrow] step.w vacío — no se animará proyectil', step);
    }
    if (!t) {
      // eslint-disable-next-line no-console
      console.warn('[animThrow] target no encontrado', step);
    }

    // Lanzar la animación del bruto (windup + lanzamiento).
    void f.display.playAnimation('throw').catch(() => {
      void f.display.playAnimation('fist');
    });

    // Esperar al frame de lanzamiento (frame 6) — ahí suena el SFX y el
    // proyectil sale de la mano. Si la animación no llega al frame, el
    // fallback resuelve a tiempo igual.
    await this.awaitFrameEvent(f.display, 'throw:launch', 250);
    playSfx('equip');

    // Quitar el arma de la mano del bruto: a partir de acá pelea con puños.
    if (step.k !== 1) {
      f.display.setWeapon(null);
    }

    // Trayectoria del arma volando hacia el oponente.
    if (t && step.w) {
      // Offset vertical fijo: apunta al pecho del bruto (visualmente ~110px
      // sobre el suelo para FIGHTER_SCALE=1.8). El `baseHeight` que reporta
      // el FighterHolder está sobre-dimensionado vs el sprite real, así que
      // usamos un valor calibrado.
      const CHEST_Y = -110;
      const startX = f.holder.x + (f.facing === 'left' ? -20 : 20);
      const startY = f.holder.y + CHEST_Y;
      const endX = t.holder.x;
      const endY = t.holder.y + CHEST_Y;
      void throwWeaponSprite({
        stage: this.stage,
        weaponId: step.w,
        from: { x: startX, y: startY },
        to: { x: endX, y: endY },
        speed: this.speed,
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[animThrow] throwWeaponSprite error', err);
      });
    }
    return this.wait(280 / this.speed);
  }

  private async animDisarm(step: DisarmStep) {
    const t = this.get(step.t);
    if (!t) return this.wait(80);
    // El arma sale volando de la mano de la víctima con física (gravedad +
    // rebotes). Dirección: lejos del centro de la arena.
    const direction: 1 | -1 = t.facing === 'right' ? -1 : 1;
    void dropWeaponWithPhysics({
      stage: this.stage,
      weaponId: step.w,
      from: {
        x: t.holder.x + (t.facing === 'left' ? -20 : 20),
        y: t.holder.y - t.display.baseHeight * 0.5,
      },
      groundY: GROUND_Y,
      direction,
      speed: this.speed,
    });
    t.display.setWeapon(null);
    playSfx('hit');
    return this.wait(160);
  }

  private async animTrash(step: TrashStep) {
    const f = this.get(step.b);
    if (!f) return this.wait(80);
    void f.display.playAnimation('trash').catch(() => {
      // Si el modelo no soporta 'trash', caemos silenciosamente.
    });
    // Sincronizar el setWeapon(null) con el frame :trashed (frame 3) y, al
    // mismo tiempo, lanzar el arma al suelo con física.
    await this.awaitFrameEvent(f.display, 'trash:trashed', 250);
    const direction: 1 | -1 = f.facing === 'right' ? 1 : -1;
    void dropWeaponWithPhysics({
      stage: this.stage,
      weaponId: step.w,
      from: {
        x: f.holder.x + (f.facing === 'left' ? -20 : 20),
        y: f.holder.y - f.display.baseHeight * 0.5,
      },
      groundY: GROUND_Y,
      direction,
      speed: this.speed,
      // El brute lo descarta con menos fuerza que un disarm enemigo.
      initialVx: 220,
      initialVy: -260,
    });
    f.display.setWeapon(null);
    return this.wait(160);
  }

  /**
   * El ladrón (b) le quita el arma a la víctima (t). Visualmente: víctima
   * pierde arma, ladrón la equipa, glow + flash dorado en ambos.
   */
  private async animSteal(step: StealStep) {
    const thief = this.get(step.b);
    const victim = this.get(step.t);
    if (!thief || !victim) return this.wait(120);
    victim.display.setWeapon(null);
    thief.display.setWeapon(step.w);
    playSfx('equip');
    void goldFlash(thief.display.container, 260);
    void glow(thief.display.container, 0xfbbf24, 360);
    void floatingText(
      this.stage,
      victim.holder.x,
      victim.holder.y - victim.display.baseHeight + 10,
      '¡Robo!',
      0xff5060,
    );
    return this.wait(220);
  }
}

/**
 * Pinta la barra de HP rellena con color por porcentaje.
 * Verde > 60%, amarillo 30-60%, rojo < 30%.
 */
function drawHpFill(g: PIXI.Graphics, pct: number): void {
  drawHpFillSized(g, pct, HP_BAR_W, HP_BAR_H);
}

/** Variante con tamaños custom (para pets, etc.) */
function drawHpFillSized(g: PIXI.Graphics, pct: number, barW: number, barH: number): void {
  const clamped = Math.max(0, Math.min(1, pct));
  const w = (barW - 2) * clamped;
  const color = clamped > 0.6 ? 0x4ade80 : clamped > 0.3 ? 0xfbbf24 : 0xb91c1c;
  g.clear();
  if (w <= 0) return;
  g.beginFill(color, 0.95);
  g.drawRoundedRect(-barW / 2 + 1, -barH / 2 + 1, w, barH - 2, 1);
  g.endFill();
}
