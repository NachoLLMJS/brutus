// Porteado de LaBrute (`labrute/core/src/brute/getRandomBody.ts`).
// Acepta `rng` opcional para determinismo desde la seed del bruto.

import type { BruteGender } from './availableBodyParts.js';
import { availableBodyParts } from './availableBodyParts.js';
import { generateBodyString } from './parsers.js';

type Rng = () => number;

function randomBetween(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function getRandomBody(gender: BruteGender, rng: Rng = Math.random): string {
  const max = availableBodyParts[gender];
  return generateBodyString({
    p1: randomBetween(0, max.p1, rng),
    p1a: randomBetween(0, max.p1a, rng),
    p1b: randomBetween(0, max.p1b, rng),
    p2: randomBetween(0, max.p2, rng),
    p3: randomBetween(0, max.p3, rng),
    p4: randomBetween(0, max.p4, rng),
    p5: randomBetween(0, max.p5, rng),
    p6: randomBetween(0, max.p6, rng),
    p7: randomBetween(0, max.p7, rng),
    p7b: randomBetween(0, max.p7b, rng),
    p8: randomBetween(0, max.p8, rng),
  });
}
