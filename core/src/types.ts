// Brutus v3 — tipos compartidos
// Inspirado en estructuras de LaBrute (`labrute/core/src/brute`, `labrute/core/src/fight`)
// pero reescrito limpio para nuestro stack: TS estricto, determinismo, sin Prisma.

export type Gender = 'M' | 'F';

export interface Stats {
  hp: number;
  strength: number;
  agility: number;
  speed: number;
}

export interface Appearance {
  gender: Gender;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
}

export interface Brute {
  id: string;
  name: string;
  seed: number;
  level: number;
  xp: number;
  rank: number;
  stats: Stats;
  skills: string[];
  weapons: string[];
  pets: string[];
  appearance: Appearance;
  victories: number;
  defeats: number;
  fightsRemaining: number;
  trainingFightsRemaining: number;
  defeatsToday: number;
  lastFightReset: number;
  pupils: string[];
  master: string | null;
  createdAt: number;
}

// ---------- Catálogos ----------

export type SkillType = 'passive' | 'active' | 'super';
export type Rarity = 'common' | 'rare' | 'legendary';

/**
 * Bonificadores aplicables sobre stats finales.
 * `flat` se suma al stat base, `percent` lo multiplica.
 */
export interface StatModifier {
  flat?: Partial<Stats>;
  percent?: Partial<Stats>;
}

export interface SkillEffects {
  // Combate
  evasion?: number;          // probabilidad extra de esquiva
  block?: number;            // probabilidad extra de bloqueo
  counter?: number;          // probabilidad extra de contraataque
  reversal?: number;         // probabilidad de revertir post-bloqueo
  accuracy?: number;         // multiplicador de precisión
  criticalChance?: number;   // probabilidad extra de crítico
  criticalDamage?: number;   // multiplicador adicional de crítico
  damageMultiplier?: number; // multiplicador global de daño infligido
  damageTaken?: number;      // multiplicador de daño recibido (1 = normal)
  combo?: number;            // probabilidad de combo (golpe extra)
  initiative?: number;       // sumando al orden de iniciativa
  regen?: number;            // HP regenerados por turno (fracción de hp max)
  // Banderas
  vampirism?: boolean;       // recupera HP en función del daño infligido
  fierce?: boolean;          // x2 daño durante "ráfaga"
  hammer?: boolean;          // golpe único masivo
  ironSkin?: boolean;        // reducción flat de daño recibido
  monk?: boolean;            // mejor counter / menor velocidad
  weaponsMaster?: boolean;   // bonus de daño con armas
  martialArts?: boolean;     // bonus de daño sin arma
  survival?: boolean;        // sobrevive con 1 HP la primera vez
  thief?: boolean;           // puede robar arma del rival
  net?: boolean;             // inmoviliza al rival un turno
  bomb?: boolean;            // golpe AoE contra mascotas
  cryOfTheDamned?: boolean;  // intimida y reduce iniciativa rival
  shock?: boolean;           // chance de desarmar rival
  treachery?: boolean;       // primer golpe garantizado
  reckless?: boolean;        // +daño infligido y recibido
  precision?: boolean;       // siempre acierta
  acrobat?: boolean;         // +esquiva, -daño
  swiftWind?: boolean;       // turno extra ocasional
  immortal?: boolean;        // umbral de muerte más bajo
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  rarity: Rarity;
  weight: number;
  statBonus?: StatModifier;
  effects?: SkillEffects;
}

export type WeaponRange = 'melee' | 'thrown';

export interface Weapon {
  id: string;
  name: string;
  description: string;
  damage: number;
  speedMod: number;   // multiplicador sobre la velocidad de ataque (1 = normal)
  accuracy: number;   // probabilidad base de acierto (0..1)
  weight: number;     // weight para draft (más alto = más común)
  range: WeaponRange;
  reach: number;      // 0 corto, 5 largo
  criticalChance: number;
  block?: number;
  evasion?: number;
  combo?: number;
  reversal?: number;
  disarm?: number;
  type?: 'fast' | 'sharp' | 'heavy' | 'long' | 'thrown' | 'blunt';
}

export interface Pet {
  id: string;
  name: string;
  description: string;
  hp: number;
  strength: number;
  agility: number;
  speed: number;
  count: number;     // cuántas instancias (e.g. 3 panteras)
  weight: number;
  damage: number;
  initiative: number;
}

// ---------- Combate ----------

export type FighterSide = 'A' | 'B';

export interface PetState {
  petId: string;
  index: number;        // 0..count-1
  hp: number;
  alive: boolean;
}

export interface FighterSnapshot {
  side: FighterSide;
  bruteId: string;
  name: string;
  hp: number;
  hpMax: number;
  alive: boolean;
  weapon: string | null;
  pets: PetState[];
}

// CombatStep — discriminated union según SPEC §6
export interface StepStart {
  type: 'start';
  turn: 0;
  fighters: { A: FighterSnapshot; B: FighterSnapshot };
}

export interface StepTurn {
  type: 'turn';
  turn: number;
  side: FighterSide;
}

export interface StepAttack {
  type: 'attack';
  turn: number;
  attacker: FighterSide;
  defender: FighterSide;
  damage: number;
  weapon: string | null;
  critical: boolean;
  combo: boolean;
  remainingHp: number;
}

export interface StepDodge {
  type: 'dodge';
  turn: number;
  attacker: FighterSide;
  defender: FighterSide;
}

export interface StepBlock {
  type: 'block';
  turn: number;
  attacker: FighterSide;
  defender: FighterSide;
}

export interface StepCounter {
  type: 'counter';
  turn: number;
  attacker: FighterSide;     // quien recibe el contraataque
  defender: FighterSide;     // quien contraataca
  damage: number;
  remainingHp: number;
}

export interface StepSkill {
  type: 'skill';
  turn: number;
  side: FighterSide;
  skillId: string;
  detail?: string;
}

export interface StepHeal {
  type: 'heal';
  turn: number;
  side: FighterSide;
  amount: number;
  remainingHp: number;
  source: 'regen' | 'vampirism' | 'potion';
}

export interface StepPetJoin {
  type: 'pet_join';
  turn: number;
  side: FighterSide;
  petId: string;
  index: number;
  hp: number;
}

export interface StepPetAttack {
  type: 'pet_attack';
  turn: number;
  attacker: FighterSide;
  petId: string;
  petIndex: number;
  defender: FighterSide;
  damage: number;
  remainingHp: number;
}

export interface StepPetDeath {
  type: 'pet_death';
  turn: number;
  side: FighterSide;
  petId: string;
  index: number;
}

export interface StepDeath {
  type: 'death';
  turn: number;
  side: FighterSide;
}

export interface StepRevive {
  type: 'revive';
  turn: number;
  side: FighterSide;
  hp: number;
  source: 'survival' | 'immortal';
}

export interface StepEnd {
  type: 'end';
  turn: number;
  winner: FighterSide;
  reason: 'death' | 'timeout';
}

export type CombatStep =
  | StepStart
  | StepTurn
  | StepAttack
  | StepDodge
  | StepBlock
  | StepCounter
  | StepSkill
  | StepHeal
  | StepPetJoin
  | StepPetAttack
  | StepPetDeath
  | StepDeath
  | StepRevive
  | StepEnd;

export interface CombatResult {
  winner: FighterSide;
  log: CombatStep[];
  finalState: {
    A: { hp: number; alive: boolean };
    B: { hp: number; alive: boolean };
  };
  duration: number; // turnos transcurridos
}

// ---------- Leveling ----------

export type LevelUpChoiceKind = 'stat' | 'skill' | 'weapon' | 'pet';

export interface StatChoice {
  kind: 'stat';
  stat: keyof Stats;
  amount: number;
  // si hay segundo stat, es un +1/+1
  secondStat?: keyof Stats;
  secondAmount?: number;
}
export interface SkillChoice { kind: 'skill'; skillId: string; }
export interface WeaponChoice { kind: 'weapon'; weaponId: string; }
export interface PetChoice { kind: 'pet'; petId: string; }

export type LevelUpChoice = StatChoice | SkillChoice | WeaponChoice | PetChoice;

export interface LevelUpOffer {
  first: LevelUpChoice;
  second: LevelUpChoice;
}

// ---------- Tournament ----------

export interface TournamentMatch {
  round: number;
  index: number;
  a: string | null;          // bruto id (null = bye)
  b: string | null;
  winner: string | null;
  log: CombatStep[];
}

export interface Tournament {
  id: string;
  seed: number;
  participants: string[];    // 8 ids
  rounds: TournamentMatch[][];
  champion: string | null;
}
