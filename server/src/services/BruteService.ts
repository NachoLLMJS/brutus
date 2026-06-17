// Orchestrates Brute persistence + core generation.

import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  deserializeBrute,
  serializeForPrisma,
  type Appearance,
  type BruteSnapshot,
} from '../lib/serialization.js';
import { generateInitialStats } from '../lib/coreBridge.js';
import { maybeResetDaily } from '../lib/dailyReset.js';

const DEFAULT_APPEARANCE: Appearance = {
  gender: 'M',
  skin: '#d2a679',
  hair: '#3b1f0e',
  shirt: '#3b3b8a',
  pants: '#1f1f1f',
};

export interface CreateBruteInput {
  name: string;
  masterId?: string;
  appearance?: Appearance;
  gender?: 'male' | 'female';
  body?: string;
  bodyColors?: string;
}

export async function createBrute(input: CreateBruteInput): Promise<BruteSnapshot> {
  const taken = await prisma.brute.findUnique({ where: { name: input.name } });
  if (taken) {
    throw new HttpError(409, 'name_taken');
  }

  if (input.masterId) {
    const master = await prisma.brute.findUnique({ where: { id: input.masterId } });
    if (!master) throw new HttpError(404, 'master_not_found');
  }

  const stats = generateInitialStats(input.name, {
    gender: input.gender,
    body: input.body,
    bodyColors: input.bodyColors,
  });
  const appearance = input.appearance ?? DEFAULT_APPEARANCE;
  const serialized = serializeForPrisma({
    skills: stats.skills,
    weapons: stats.weapons,
    pets: stats.pets,
    appearance,
  });

  const created = await prisma.brute.create({
    data: {
      name: input.name,
      seed: stats.seed,
      hp: stats.hp,
      strength: stats.strength,
      agility: stats.agility,
      speed: stats.speed,
      skills: serialized.skills!,
      weapons: serialized.weapons!,
      pets: serialized.pets!,
      appearance: serialized.appearance!,
      gender: stats.gender,
      body: stats.body,
      bodyColors: stats.bodyColors,
      masterId: input.masterId ?? null,
    },
  });
  return deserializeBrute(created);
}

export async function listBrutes(limit = 50): Promise<BruteSnapshot[]> {
  const rows = await prisma.brute.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });
  return rows.map(deserializeBrute);
}

export async function getBruteById(id: string): Promise<BruteSnapshot> {
  const found = await prisma.brute.findUnique({ where: { id } });
  if (!found) throw new HttpError(404, 'brute_not_found');
  const row = await maybeResetDaily(found);
  return deserializeBrute(row);
}

export interface PupilSummary {
  id: string;
  name: string;
  level: number;
}

export async function listPupils(masterId: string): Promise<PupilSummary[]> {
  // Throw if the master doesn't exist so the caller gets a 404 rather than
  // an empty list silently masking a bad ID.
  const master = await prisma.brute.findUnique({
    where: { id: masterId },
    select: { id: true },
  });
  if (!master) throw new HttpError(404, 'brute_not_found');

  const rows = await prisma.brute.findMany({
    where: { masterId },
    select: { id: true, name: true, level: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows;
}
