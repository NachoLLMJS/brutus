/** Helpers cortos de formato. */

export const clamp = (n: number, min: number, max: number): number =>
  Math.min(Math.max(n, min), max);

export const pct = (value: number, max: number): number => {
  if (max <= 0) return 0;
  return clamp((value / max) * 100, 0, 100);
};

export const formatRank = (rank: number): string => (rank > 0 ? `Rango ${rank}` : '');

export const isValidName = (s: string): boolean => /^[A-Za-z0-9 ]{3,20}$/.test(s.trim());
