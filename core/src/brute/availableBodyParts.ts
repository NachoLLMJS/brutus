// Porteado de LaBrute (`labrute/core/src/brute/availableBodyParts.ts`).
// Define cuántas variantes existen para cada parte del cuerpo, por género.

export type BruteGender = 'male' | 'female';

export interface BodyPartCounts {
  p1: number;
  p1a: number;
  p1b: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  p6: number;
  p7: number;
  p7b: number;
  p8: number;
}

export const availableBodyParts: Record<BruteGender, BodyPartCounts> = {
  male: {
    p2: 7,
    p3: 11,
    p4: 5,
    p7: 6,
    p1: 1,
    p1a: 1,
    p1b: 1,
    p6: 1,
    p8: 4,
    p7b: 2,
    p5: 1,
  },
  female: {
    p2: 0,
    p3: 11,
    p4: 3,
    p7: 6,
    p1: 1,
    p1a: 1,
    p1b: 1,
    p6: 0,
    p8: 4,
    p7b: 2,
    p5: 1,
  },
};
