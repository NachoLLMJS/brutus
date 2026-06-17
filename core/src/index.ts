// Brutus core — barrel exports.

export * from './types.js';
export * from './random.js';
export { simulate } from './combat/CombatEngine.js';
export {
  applySkillStatBonuses,
  aggregateEffects,
  buildFighter,
} from './combat/skills.js';
export {
  rollDamage,
  dodgeChance,
  blockChance,
  counterChance,
  criticalChance,
  comboChance,
  applyIncomingMitigation,
} from './combat/damage.js';
export { SKILLS, SKILLS_BY_ID, getSkill } from './data/skills.js';
export { WEAPONS, WEAPONS_BY_ID, getWeapon } from './data/weapons.js';
export { PETS, PETS_BY_ID, getPet } from './data/pets.js';
export {
  xpToNext,
  totalXpForLevel,
  computeChoices,
  applyChoice,
  addXp,
  canLevelUp,
} from './leveling.js';
export {
  generate as generateTournament,
  runNextRound as runTournamentNextRound,
  run as runTournament,
} from './tournament.js';

// Sistema de combate animado: Steps tipo LaBrute para FightViewer Pixi.
export {
  StepType,
  toFightLog,
} from './fight/index.js';
export type {
  FightStep,
  FightLog,
  FightFighter,
  FightPet,
  PetModel,
  WeaponId,
  SkillId,
  ArriveStep,
  MoveStep,
  AttemptHitStep,
  HitStep,
  EvadeStep,
  BlockStep,
  CounterStep,
  DeathStep,
  EndStep,
  SurviveStep,
  HealStep,
  VampirismStep,
  SkillActivateStep,
  EquipStep,
  AnimationModel,
} from './fight/index.js';

// Apariencia visual (body/colors/gender, porteado de LaBrute).
export type { BruteGender, BruteBodyPart, BruteColor } from './brute/index.js';
export {
  availableBodyParts,
  colors as appearancePalettes,
  getPalette,
  readBodyString,
  generateBodyString,
  readColorString,
  generateColorString,
  getColor,
  getRandomBody,
  getRandomColors,
} from './brute/index.js';
