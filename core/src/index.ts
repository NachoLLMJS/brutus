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
