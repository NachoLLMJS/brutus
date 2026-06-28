// Porteado de LaBrute (`labrute/core/src/types.ts:55-447`).
// Tipos canónicos de los Step que emite el motor de combate y consume el
// FightViewer Pixi.
//
// Fase 1 del MVP: el motor de Brutus solo emite los Step necesarios para
// reproducir un combate básico (Arrive, Move, AttemptHit, Hit, Block, Evade,
// Death, End, Counter, Equip). Los demás tipos están portados para que el
// porte futuro de skills no requiera re-tocar estos archivos.

export type WeaponId = string;
export type SkillId = string;

export enum StepType {
  Saboteur,
  Leave,
  Arrive,
  Trash,
  Steal,
  Trap,
  Heal,
  Resist,
  Survive,
  Hit,
  FlashFlood,
  Hammer,
  Poison,
  Bomb,
  Hypnotise,
  Move,
  Eat,
  MoveBack,
  Equip,
  AttemptHit,
  Block,
  Evade,
  Sabotage,
  Disarm,
  Death,
  Throw,
  End,
  Counter,
  SkillActivate,
  SkillExpire,
  Spy,
  Vampirism,
  Haste,
  Treat,
  DropShield,
  Regeneration,
}

export interface SaboteurStep { a: StepType.Saboteur; b: number; w: WeaponId; }
export interface LeaveStep { a: StepType.Leave; f: number; }
export interface ArriveStep { a: StepType.Arrive; f: number; w?: WeaponId; }
export interface TrashStep { a: StepType.Trash; b: number; w: WeaponId; }
export interface StealStep { a: StepType.Steal; b: number; w: WeaponId; t: number; }
export interface TrapStep { a: StepType.Trap; b: number; t: number; }
export interface HealStep { a: StepType.Heal; b: number; h: number; c?: 1 | 0; hp?: number; }
export interface ResistStep { a: StepType.Resist; b: number; }
export interface SurviveStep { a: StepType.Survive; b: number; }
export interface HitStep {
  a: StepType.Hit | StepType.FlashFlood | StepType.Hammer | StepType.Poison;
  f: number;
  t: number;
  w?: WeaponId;
  d: number;
  /** HP absoluto del target tras aplicar este daño. */
  hp?: number;
  s?: 1 | 0;
  c?: 1 | 0;
}
export interface BombStep {
  a: StepType.Bomb;
  f: number;
  t: number[];
  d: Record<string, number | undefined>;
}
export interface HypnotiseStep {
  a: StepType.Hypnotise;
  b: number;
  t: number[];
  p: number[];
}
export interface MoveStep {
  a: StepType.Move;
  f: number;
  t: number;
  s?: 1 | 0;
  c?: 1 | 0;
  r?: 1 | 0;
}
export interface EatStep { a: StepType.Eat; b: number; t: number; h: number; }
export interface MoveBackStep { a: StepType.MoveBack; f: number; }
export interface EquipStep { a: StepType.Equip; b: number; w: WeaponId; }
export interface AttemptHitStep {
  a: StepType.AttemptHit;
  f: number;
  t: number;
  w?: WeaponId;
  b?: 1 | 0;
}
export interface BlockStep { a: StepType.Block; f: number; }
export interface EvadeStep { a: StepType.Evade; f: number; }
export interface SabotageStep { a: StepType.Sabotage; f: number; t: number; w: WeaponId; }
export interface DisarmStep { a: StepType.Disarm; f: number; t: number; w: WeaponId; }
export interface DeathStep { a: StepType.Death; f: number; }
export interface ThrowStep {
  a: StepType.Throw;
  f: number;
  t: number;
  w: WeaponId;
  k?: 1 | 0;
  r?: 1 | 0;
}
export interface EndStep { a: StepType.End; w: number; l: number; }
export interface CounterStep { a: StepType.Counter; f: number; t: number; }
export interface SkillActivateStep {
  a: StepType.SkillActivate;
  b: number;
  s: SkillId;
  p?: number[];
}
export interface SkillExpireStep {
  a: StepType.SkillExpire;
  b?: number;
  f?: number;
  s: SkillId;
}
export interface SpyStep {
  a: StepType.Spy;
  b: number;
  t: number;
  s: WeaponId[];
  r: WeaponId[];
}
export interface VampirismStep {
  a: StepType.Vampirism;
  b: number;
  t: number;
  d: number;
  h: number;
  /** HP absoluto del bruto tras curarse. */
  hp?: number;
}
export interface HasteStep {
  a: StepType.Haste;
  b: number;
  t: number;
  d: number;
  c?: 1 | 0;
}
export interface TreatStep {
  a: StepType.Treat;
  b: number;
  t: number;
  h: number;
  c?: 1 | 0;
}
export interface DropShieldStep { a: StepType.DropShield; b: number; }
export interface RegenerationStep {
  a: StepType.Regeneration;
  f: number;
  h: number;
  d?: 1 | 0;
}

export type FightStep =
  | SaboteurStep | LeaveStep | ArriveStep | TrashStep | StealStep | TrapStep
  | HealStep | ResistStep | SurviveStep | HitStep | BombStep | HypnotiseStep
  | MoveStep | EatStep | MoveBackStep | EquipStep | AttemptHitStep | BlockStep
  | EvadeStep | SabotageStep | DisarmStep | DeathStep | ThrowStep | EndStep
  | CounterStep | SkillActivateStep | SkillExpireStep | SpyStep | VampirismStep
  | HasteStep | TreatStep | DropShieldStep | RegenerationStep;

/**
 * Representación de un fighter en el log. Mucho más liviano que el `Brute`
 * completo; el FightViewer lo usa para conocer side, gender, body y colores
 * para renderizar con BruteDisplay.
 */
export interface FightFighter {
  /** Numérico, usado por los Steps. Convención: 1 = player, 2 = opponent. */
  id: number;
  /** Lado en la arena. */
  side: 'left' | 'right';
  /** Datos para el renderer Pixi. */
  bruteId: string;
  name: string;
  gender: 'male' | 'female';
  body: string;
  bodyColors: string;
  lpc?: import('../types.js').LpcAppearance;
  /** HP inicial del bruto (max para barra). */
  maxHp: number;
}

/**
 * Modelo visual de pet para el renderer. Los ids del catálogo de Brutus
 * (wolf/mastiff/panthers/bear) se mapean a uno de estos 3 modelos
 * (dog comparte sprite con wolf y mastiff; panther tiene su propio modelo).
 */
export type PetModel = 'dog' | 'bear' | 'panther';

/**
 * Pet visible en la arena. Cada entrada es UN sprite (e.g. una pantera de las 3).
 */
export interface FightPet {
  /** Id numérico único en el FightLog. Convención: 11..13 (lado A) / 21..23 (lado B). */
  id: number;
  side: 'left' | 'right';
  /** Id del catálogo de Brutus (`wolf`, `bear`, `panthers`, `mastiff`). */
  petId: string;
  /** Qué set de Symbols del FLA usar para renderizar. */
  model: PetModel;
  name: string;
  /** Id del fighter dueño (1 o 2). */
  owner: number;
  /** Index del pet dentro de la entrada del catálogo (0..count-1). */
  indexInOwner: number;
  /** HP máximo del pet (para la barra de vida flotante). */
  maxHp: number;
}

export interface FightLog {
  fighters: [FightFighter, FightFighter];
  /** Pets del lado A y B. Opcional para backward-compat con peleas pre-A2. */
  pets?: FightPet[];
  steps: FightStep[];
}

export type AnimationModel = 'bear' | 'dog' | 'panther' | 'male-brute' | 'female-brute';
