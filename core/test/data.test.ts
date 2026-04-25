import { describe, it, expect } from 'vitest';
import { SKILLS, WEAPONS, PETS } from '../src/index.js';

describe('catálogos', () => {
  it('al menos 28 skills', () => {
    expect(SKILLS.length).toBeGreaterThanOrEqual(28);
  });

  it('al menos 26 weapons', () => {
    expect(WEAPONS.length).toBeGreaterThanOrEqual(26);
  });

  it('al menos 3 pets', () => {
    expect(PETS.length).toBeGreaterThanOrEqual(3);
  });

  it('todos los IDs de skills son únicos', () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos los IDs de weapons son únicos', () => {
    const ids = WEAPONS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos los IDs de pets son únicos', () => {
    const ids = PETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('skill schema mínimo: id/name/description/type/rarity/weight', () => {
    for (const s of SKILLS) {
      expect(typeof s.id).toBe('string');
      expect(s.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(typeof s.name).toBe('string');
      expect(s.name.length).toBeGreaterThan(0);
      expect(typeof s.description).toBe('string');
      expect(['passive', 'active', 'super']).toContain(s.type);
      expect(['common', 'rare', 'legendary']).toContain(s.rarity);
      expect(s.weight).toBeGreaterThan(0);
    }
  });

  it('weapon schema mínimo: id/name/damage/range', () => {
    for (const w of WEAPONS) {
      expect(typeof w.id).toBe('string');
      expect(w.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(w.damage).toBeGreaterThan(0);
      expect(['melee', 'thrown']).toContain(w.range);
      expect(w.accuracy).toBeGreaterThanOrEqual(0);
      expect(w.accuracy).toBeLessThanOrEqual(1);
    }
  });

  it('pet schema mínimo: id/hp/count', () => {
    for (const p of PETS) {
      expect(typeof p.id).toBe('string');
      expect(p.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(p.hp).toBeGreaterThan(0);
      expect(p.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('cobertura de IDs requeridos por la spec', () => {
    const skillIds = new Set(SKILLS.map((s) => s.id));
    for (const required of [
      'herculean_strength', 'feline_agility', 'lightning_bolt', 'vitality',
      'immortal', 'untouchable', 'vampirism', 'regeneration', 'hammer',
      'fierce_brute', 'tragic_potion', 'cry_of_the_damned', 'shock', 'thief',
      'monk', 'weapons_master', 'martial_arts', 'survival', 'counter',
      'iron_skin', 'swift_wind', 'bomb', 'net', 'reckless', 'precision',
      'berserk', 'acrobat', 'treachery',
    ]) {
      expect(skillIds.has(required), `falta skill ${required}`).toBe(true);
    }

    const weaponIds = new Set(WEAPONS.map((w) => w.id));
    for (const required of [
      'knife', 'whip', 'noodle_bowl', 'sai', 'hatchet', 'axe', 'scimitar',
      'mighty_hammer', 'halberd', 'lance', 'trident', 'nunchaku',
      'broadsword', 'shuriken', 'mug', 'bo_staff', 'katana', 'flail',
      'morning_star', 'dagger', 'claymore', 'rapier', 'crossbow',
      'chain_whip', 'frying_pan', 'wrench',
    ]) {
      expect(weaponIds.has(required), `falta weapon ${required}`).toBe(true);
    }

    const petIds = new Set(PETS.map((p) => p.id));
    for (const required of ['wolf', 'bear', 'panthers']) {
      expect(petIds.has(required), `falta pet ${required}`).toBe(true);
    }
  });
});
