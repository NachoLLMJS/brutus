// Barrel: helpers para apariencia visual del bruto (porteados de LaBrute).

export type { BruteGender, BodyPartCounts } from './availableBodyParts.js';
export { availableBodyParts } from './availableBodyParts.js';

export type { PalettesByGender, ColorsByGender } from './colors.js';
export { colors, getPalette } from './colors.js';

export type { BruteBodyPart, BruteColor } from './parsers.js';
export {
  readBodyString,
  generateBodyString,
  readColorString,
  generateColorString,
  getColor,
} from './parsers.js';

export { getRandomBody } from './getRandomBody.js';
export { getRandomColors } from './getRandomColors.js';
