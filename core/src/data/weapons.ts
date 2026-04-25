// Catálogo de armas — porteado de `labrute/core/src/brute/weapons.ts`.
// Reescribimos en formato propio (los stats originales son tuplas por tier;
// nosotros usamos el tier medio como balance por defecto).
// Nombres y descripciones en español, IDs en inglés snake_case.

import type { Weapon } from '../types.js';

export const WEAPONS: readonly Weapon[] = [
  {
    id: 'knife', name: 'Cuchillo',
    description: 'Hoja corta, rápida y precisa. Buena para combos.',
    damage: 10, speedMod: 1.6, accuracy: 0.95, weight: 80,
    range: 'melee', reach: 0, criticalChance: 0.25, combo: 0.4,
    type: 'fast',
  },
  {
    id: 'whip', name: 'Látigo',
    description: 'Largo alcance, ideal para mantener distancia.',
    damage: 15, speedMod: 0.7, accuracy: 0.8, weight: 3,
    range: 'melee', reach: 5, criticalChance: 0, evasion: 0.35, combo: 0.4,
    disarm: 0.35, type: 'long',
  },
  {
    id: 'noodle_bowl', name: 'Cuenco de Fideos',
    description: 'Arrojadizo improvisado pero contundente.',
    damage: 15, speedMod: 2.0, accuracy: 0.9, weight: 1,
    range: 'thrown', reach: 0, criticalChance: 0, combo: 0.4,
    type: 'thrown',
  },
  {
    id: 'sai', name: 'Sai',
    description: 'Hoja en horquilla, excelente para desarmar.',
    damage: 12, speedMod: 1.5, accuracy: 0.9, weight: 6,
    range: 'melee', reach: 0, criticalChance: 0.05, block: 0.35,
    disarm: 0.8, combo: 0.35, type: 'fast',
  },
  {
    id: 'hatchet', name: 'Hachuela',
    description: 'Hacha pequeña, balanceada entre velocidad y daño.',
    damage: 22, speedMod: 0.65, accuracy: 0.85, weight: 40,
    range: 'melee', reach: 1, criticalChance: 0.25, type: 'sharp',
  },
  {
    id: 'axe', name: 'Hacha',
    description: 'Pesada y lenta, pero golpea como un meteoro.',
    damage: 75, speedMod: 0.42, accuracy: 0.7, weight: 3,
    range: 'melee', reach: 1, criticalChance: 0, disarm: 0.15,
    type: 'heavy',
  },
  {
    id: 'scimitar', name: 'Cimitarra',
    description: 'Sable curvo de filo letal.',
    damage: 15, speedMod: 1.2, accuracy: 0.85, weight: 6,
    range: 'melee', reach: 1, criticalChance: 0.1, combo: 0.25,
    type: 'sharp',
  },
  {
    id: 'mighty_hammer', name: 'Martillo Poderoso',
    description: 'Cabeza maciza que aplasta huesos.',
    damage: 40, speedMod: 0.45, accuracy: 0.75, weight: 6,
    range: 'melee', reach: 1, criticalChance: 0.1, disarm: 0.15,
    type: 'heavy',
  },
  {
    id: 'halberd', name: 'Alabarda',
    description: 'Lanza con hacha en la punta. Largo alcance.',
    damage: 30, speedMod: 0.55, accuracy: 0.8, weight: 2,
    range: 'melee', reach: 4, criticalChance: 0, combo: 0.15,
    disarm: 0.15, type: 'long',
  },
  {
    id: 'lance', name: 'Lanza',
    description: 'Punta afilada para empalar a distancia.',
    damage: 16, speedMod: 0.85, accuracy: 0.85, weight: 40,
    range: 'melee', reach: 3, criticalChance: 0.25, disarm: 0.15,
    type: 'long',
  },
  {
    id: 'trident', name: 'Tridente',
    description: 'Tres puntas, tres veces el dolor.',
    damage: 18, speedMod: 0.7, accuracy: 0.85, weight: 10,
    range: 'melee', reach: 3, criticalChance: 0.1, disarm: 0.3,
    type: 'long',
  },
  {
    id: 'nunchaku', name: 'Nunchaku',
    description: 'Dos palos unidos por una cadena, rápido y tramposo.',
    damage: 9, speedMod: 1.3, accuracy: 0.85, weight: 6,
    range: 'melee', reach: 1, criticalChance: 0.15, combo: 0.45,
    type: 'fast',
  },
  {
    id: 'broadsword', name: 'Espada Ancha',
    description: 'Espada clásica de combate, equilibrada.',
    damage: 13, speedMod: 0.85, accuracy: 0.85, weight: 100,
    range: 'melee', reach: 1, criticalChance: 0.35, block: 0.25,
    disarm: 0.2, type: 'sharp',
  },
  {
    id: 'shuriken', name: 'Shuriken',
    description: 'Estrellas arrojadizas. Rápidas pero débiles.',
    damage: 5, speedMod: 2.5, accuracy: 0.85, weight: 8,
    range: 'thrown', reach: 0, criticalChance: 0, combo: 0.4,
    type: 'thrown',
  },
  {
    id: 'mug', name: 'Jarra',
    description: 'Una jarra contundente. No subestimes su peso.',
    damage: 12, speedMod: 1.2, accuracy: 0.85, weight: 1,
    range: 'melee', reach: 0, criticalChance: 0, evasion: 0.2,
    combo: 0.5, type: 'fast',
  },
  {
    id: 'bo_staff', name: 'Bastón Bo',
    description: 'Vara larga, defensiva y precisa.',
    damage: 8, speedMod: 1.1, accuracy: 0.9, weight: 70,
    range: 'melee', reach: 3, criticalChance: 0.25, block: 0.3,
    reversal: 0.35, disarm: 0.3, type: 'long',
  },
  {
    id: 'katana', name: 'Katana',
    description: 'Hoja japonesa de filo perfecto.',
    damage: 20, speedMod: 1.0, accuracy: 0.9, weight: 4,
    range: 'melee', reach: 2, criticalChance: 0.3, combo: 0.2,
    type: 'sharp',
  },
  {
    id: 'flail', name: 'Mangual',
    description: 'Bola con púas en cadena. Brutal pero indómito.',
    damage: 42, speedMod: 0.45, accuracy: 0.8, weight: 4,
    range: 'melee', reach: 1, criticalChance: 0, combo: 0.35,
    type: 'heavy',
  },
  {
    id: 'morning_star', name: 'Lucero del Alba',
    description: 'Maza con púas. Castigo medieval.',
    damage: 30, speedMod: 0.65, accuracy: 0.85, weight: 6,
    range: 'melee', reach: 1, criticalChance: 0.1, disarm: 0.15,
    type: 'heavy',
  },
  {
    id: 'dagger', name: 'Daga',
    description: 'Hoja minúscula para golpes traicioneros.',
    damage: 8, speedMod: 1.8, accuracy: 0.95, weight: 50,
    range: 'melee', reach: 0, criticalChance: 0.3, combo: 0.45,
    type: 'fast',
  },
  {
    id: 'claymore', name: 'Mandoble',
    description: 'Espada gigantesca. Lenta pero demoledora.',
    damage: 36, speedMod: 0.5, accuracy: 0.75, weight: 4,
    range: 'melee', reach: 2, criticalChance: 0.1, type: 'sharp',
  },
  {
    id: 'rapier', name: 'Estoque',
    description: 'Punta finísima para estocadas certeras.',
    damage: 11, speedMod: 1.3, accuracy: 0.95, weight: 8,
    range: 'melee', reach: 2, criticalChance: 0.15, combo: 0.25,
    type: 'sharp',
  },
  {
    id: 'crossbow', name: 'Ballesta',
    description: 'Saetas a distancia. Carga lenta, golpe seguro.',
    damage: 14, speedMod: 0.8, accuracy: 0.95, weight: 5,
    range: 'thrown', reach: 0, criticalChance: 0.2,
    type: 'thrown',
  },
  {
    id: 'chain_whip', name: 'Látigo de Cadena',
    description: 'Eslabones letales que se enredan en el rival.',
    damage: 13, speedMod: 0.9, accuracy: 0.8, weight: 4,
    range: 'melee', reach: 4, criticalChance: 0.05, disarm: 0.4,
    combo: 0.3, type: 'long',
  },
  {
    id: 'frying_pan', name: 'Sartén',
    description: 'Cocina y combate, todo en uno.',
    damage: 22, speedMod: 0.85, accuracy: 0.8, weight: 1,
    range: 'melee', reach: 1, criticalChance: 0, block: 0.45,
    type: 'heavy',
  },
  {
    id: 'wrench', name: 'Llave Inglesa',
    description: 'Pesada herramienta convertida en arma.',
    damage: 14, speedMod: 0.95, accuracy: 0.85, weight: 8,
    range: 'melee', reach: 1, criticalChance: 0.1, disarm: 0.25,
    type: 'blunt',
  },
  {
    id: 'fan', name: 'Abanico',
    description: 'Hojas afiladas escondidas en seda.',
    damage: 6, speedMod: 2.2, accuracy: 0.85, weight: 2,
    range: 'melee', reach: 0, criticalChance: 0, evasion: 0.65,
    combo: 0.5, reversal: 0.55, type: 'fast',
  },
] as const;

export const WEAPONS_BY_ID: ReadonlyMap<string, Weapon> = new Map(
  WEAPONS.map((w) => [w.id, w] as const),
);

export function getWeapon(id: string): Weapon | undefined {
  return WEAPONS_BY_ID.get(id);
}
