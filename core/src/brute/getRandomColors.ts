// Porteado de LaBrute (`labrute/core/src/brute/getRandomColors.ts`).
// Acepta `rng` opcional para determinismo desde la seed del bruto.

import type { BruteGender } from './availableBodyParts.js';
import { colors } from './colors.js';
import { generateColorString } from './parsers.js';

type Rng = () => number;

function randomBetween(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function getRandomColors(gender: BruteGender, rng: Rng = Math.random): string {
  const skinMax = colors[gender].skin.length - 1;
  const hairMax = colors[gender].hair.length - 1;
  const clothMax = colors[gender].clothing.length - 1;

  // Skin: el mismo índice se aplica a las 3 sub-zonas para coherencia visual.
  const col0 = randomBetween(0, skinMax, rng);
  // Hair: idem para las 5 sub-zonas.
  const col1 = randomBetween(0, hairMax, rng);

  return generateColorString({
    col0,
    col0a: col0,
    col0c: col0,
    col1,
    col1a: col1,
    col1b: col1,
    col1c: col1,
    col1d: col1,
    col2: randomBetween(0, clothMax, rng),
    col2a: randomBetween(0, clothMax, rng),
    col2b: randomBetween(0, clothMax, rng),
    col3: randomBetween(0, clothMax, rng),
    col3b: randomBetween(0, clothMax, rng),
    col4: randomBetween(0, clothMax, rng),
    col4a: randomBetween(0, clothMax, rng),
    col4b: randomBetween(0, clothMax, rng),
  });
}
