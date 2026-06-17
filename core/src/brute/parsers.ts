// Porteado de LaBrute (`labrute/core/src/brute/parsers.ts`).
// Convierte entre strings hex compactos y objetos tipados.

import type { BruteGender } from './availableBodyParts.js';
import { colors } from './colors.js';

export type BruteBodyPart =
  | 'p1' | 'p1a' | 'p1b' | 'p2' | 'p3' | 'p4'
  | 'p5' | 'p6' | 'p7' | 'p7b' | 'p8';

export type BruteColor =
  | 'col0' | 'col0a' | 'col0c'
  | 'col1' | 'col1a' | 'col1b' | 'col1c' | 'col1d'
  | 'col2' | 'col2a' | 'col2b'
  | 'col3' | 'col3b'
  | 'col4' | 'col4a' | 'col4b';

function pad(n: number, width: number): string {
  const s = n.toString(16);
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

function hexAt(s: string, i: number): number {
  const ch = s[i];
  return parseInt(ch ?? '0', 16);
}

export function readBodyString(bodyString: string): Record<BruteBodyPart, number> {
  return {
    p1: hexAt(bodyString, 0),
    p1a: hexAt(bodyString, 1),
    p1b: hexAt(bodyString, 2),
    p2: hexAt(bodyString, 3),
    p3: hexAt(bodyString, 4),
    p4: hexAt(bodyString, 5),
    p5: hexAt(bodyString, 6),
    p6: hexAt(bodyString, 7),
    p7: hexAt(bodyString, 8),
    p7b: hexAt(bodyString, 9),
    p8: hexAt(bodyString, 10),
  };
}

export function generateBodyString(body: Record<BruteBodyPart, number>): string {
  return [
    body.p1.toString(16),
    body.p1a.toString(16),
    body.p1b.toString(16),
    body.p2.toString(16),
    body.p3.toString(16),
    body.p4.toString(16),
    body.p5.toString(16),
    body.p6.toString(16),
    body.p7.toString(16),
    body.p7b.toString(16),
    body.p8.toString(16),
  ].join('');
}

const SKIN_PARTS: BruteColor[] = ['col0', 'col0a', 'col0c'];
const HAIR_PARTS: BruteColor[] = ['col1', 'col1a', 'col1b', 'col1c', 'col1d'];
const CLOTHING_PARTS: BruteColor[] = [
  'col2', 'col2a', 'col2b',
  'col3', 'col3b',
  'col4', 'col4a', 'col4b',
];

export function getColor(gender: BruteGender, part: BruteColor, color: number): string {
  let palette: string[] = [];
  if (SKIN_PARTS.includes(part)) palette = colors[gender].skin;
  else if (HAIR_PARTS.includes(part)) palette = colors[gender].hair;
  else if (CLOTHING_PARTS.includes(part)) palette = colors[gender].clothing;

  const found = palette[color];
  if (found) return found;
  return colors.special[99 - color] ?? '#ffffff';
}

function pairAsInt(s: string, start: number): number {
  return parseInt(s.slice(start, start + 2) || '0', 10);
}

export function readColorString(
  gender: BruteGender,
  colorsString: string,
): Record<BruteColor, string> {
  return {
    col0: getColor(gender, 'col0', pairAsInt(colorsString, 0)),
    col0a: getColor(gender, 'col0a', pairAsInt(colorsString, 2)),
    col0c: getColor(gender, 'col0c', pairAsInt(colorsString, 4)),
    col1: getColor(gender, 'col1', pairAsInt(colorsString, 6)),
    col1a: getColor(gender, 'col1a', pairAsInt(colorsString, 8)),
    col1b: getColor(gender, 'col1b', pairAsInt(colorsString, 10)),
    col1c: getColor(gender, 'col1c', pairAsInt(colorsString, 12)),
    col1d: getColor(gender, 'col1d', pairAsInt(colorsString, 14)),
    col2: getColor(gender, 'col2', pairAsInt(colorsString, 16)),
    col2a: getColor(gender, 'col2a', pairAsInt(colorsString, 18)),
    col2b: getColor(gender, 'col2b', pairAsInt(colorsString, 20)),
    col3: getColor(gender, 'col3', pairAsInt(colorsString, 22)),
    col3b: getColor(gender, 'col3b', pairAsInt(colorsString, 24)),
    col4: getColor(gender, 'col4', pairAsInt(colorsString, 26)),
    col4a: getColor(gender, 'col4a', pairAsInt(colorsString, 28)),
    col4b: getColor(gender, 'col4b', pairAsInt(colorsString, 30)),
  };
}

export function generateColorString(c: Record<BruteColor, number>): string {
  return [
    pad(c.col0, 2),
    pad(c.col0a, 2),
    pad(c.col0c, 2),
    pad(c.col1, 2),
    pad(c.col1a, 2),
    pad(c.col1b, 2),
    pad(c.col1c, 2),
    pad(c.col1d, 2),
    pad(c.col2, 2),
    pad(c.col2a, 2),
    pad(c.col2b, 2),
    pad(c.col3, 2),
    pad(c.col3b, 2),
    pad(c.col4, 2),
    pad(c.col4a, 2),
    pad(c.col4b, 2),
  ].join('');
}
