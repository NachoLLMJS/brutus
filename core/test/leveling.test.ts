import { describe, it, expect } from 'vitest';
import {
  xpToNext, totalXpForLevel, computeChoices, applyChoice, addXp, canLevelUp, mulberry32,
} from '../src/index.js';
import { makeBrute } from './helpers.js';

describe('leveling — curva XP', () => {
  it('xpToNext crece linealmente', () => {
    expect(xpToNext(1)).toBe(Math.floor(1.2 * 1 + 3));
    expect(xpToNext(5)).toBe(Math.floor(1.2 * 5 + 3));
    expect(xpToNext(50)).toBe(Math.floor(1.2 * 50 + 3));
    // monótona
    for (let l = 1; l < 50; l++) {
      expect(xpToNext(l + 1)).toBeGreaterThanOrEqual(xpToNext(l));
    }
  });

  it('totalXpForLevel acumula correctamente', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(xpToNext(1));
    expect(totalXpForLevel(3)).toBe(xpToNext(1) + xpToNext(2));
  });
});

describe('leveling — choices', () => {
  it('computeChoices devuelve dos opciones distintas en su naturaleza', () => {
    const b = makeBrute({});
    const offer = computeChoices(b, mulberry32(1));
    expect(offer.first).toBeDefined();
    expect(offer.second).toBeDefined();
    expect(offer.second.kind).toBe('stat');
  });

  it('determinista: misma seed = mismo offer', () => {
    const b = makeBrute({});
    const o1 = computeChoices(b, mulberry32(42));
    const o2 = computeChoices(b, mulberry32(42));
    expect(JSON.stringify(o1)).toBe(JSON.stringify(o2));
  });

  it('no ofrece skill ya aprendida', () => {
    const allSkillIds = ['herculean_strength', 'feline_agility', 'lightning_bolt', 'vitality'];
    const b = makeBrute({ skills: allSkillIds });
    for (let s = 0; s < 50; s++) {
      const offer = computeChoices(b, mulberry32(s));
      if (offer.first.kind === 'skill') {
        expect(allSkillIds).not.toContain(offer.first.skillId);
      }
    }
  });
});

describe('leveling — applyChoice', () => {
  it('+2 stat aplicado', () => {
    const b = makeBrute({ stats: { hp: 100, strength: 10, agility: 10, speed: 10 }, xp: 999 });
    const r = applyChoice(b, { kind: 'stat', stat: 'strength', amount: 2 });
    expect(r.stats.strength).toBe(12);
    expect(r.level).toBe(2);
  });

  it('+1/+1 stat aplicado a dos stats', () => {
    const b = makeBrute({ stats: { hp: 100, strength: 10, agility: 10, speed: 10 }, xp: 999 });
    const r = applyChoice(b, {
      kind: 'stat', stat: 'strength', amount: 1,
      secondStat: 'agility', secondAmount: 1,
    });
    expect(r.stats.strength).toBe(11);
    expect(r.stats.agility).toBe(11);
  });

  it('skill aprendida agrega al array', () => {
    const b = makeBrute({ xp: 999 });
    const r = applyChoice(b, { kind: 'skill', skillId: 'iron_skin' });
    expect(r.skills).toContain('iron_skin');
  });

  it('weapon aprendida agrega al array', () => {
    const b = makeBrute({ xp: 999 });
    const r = applyChoice(b, { kind: 'weapon', weaponId: 'katana' });
    expect(r.weapons).toContain('katana');
  });

  it('pet aprendida agrega al array', () => {
    const b = makeBrute({ xp: 999 });
    const r = applyChoice(b, { kind: 'pet', petId: 'wolf' });
    expect(r.pets).toContain('wolf');
  });

  it('addXp / canLevelUp', () => {
    let b = makeBrute({ level: 1, xp: 0 });
    expect(canLevelUp(b)).toBe(false);
    b = addXp(b, 10);
    expect(canLevelUp(b)).toBe(true);
  });

  it('applyChoice no muta el original', () => {
    const b = makeBrute({ skills: [], xp: 999 });
    const snap = JSON.stringify(b);
    applyChoice(b, { kind: 'skill', skillId: 'iron_skin' });
    expect(JSON.stringify(b)).toBe(snap);
  });
});
