#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

function sqlitePathFromDatabaseUrl(value) {
  if (!value?.startsWith('file:')) return null;
  return fileURLToPath(value);
}

function ensureSqliteDirectory(databaseUrl) {
  const sqlitePath = sqlitePathFromDatabaseUrl(databaseUrl);
  if (!sqlitePath) return;
  mkdirSync(dirname(sqlitePath), { recursive: true });
}

function setDefaultEnv(name, value) {
  if (!process.env[name] || process.env[name].trim() === '') {
    process.env[name] = value;
    console.warn(`[start-production] ${name} was not set; using fallback ${value.startsWith('file:') ? value : '<generated>'}`);
    return true;
  }
  return false;
}

function configureDatabaseUrl() {
  const usedPersistentDefault = setDefaultEnv('DATABASE_URL', 'file:/data/brutus.db');
  try {
    ensureSqliteDirectory(process.env.DATABASE_URL);
  } catch (err) {
    if (!usedPersistentDefault) throw err;
    console.warn('[start-production] /data is unavailable; falling back to ephemeral file:/tmp/brutus-railway.db. Mount Railway volume at /data for persistence.');
    process.env.DATABASE_URL = 'file:/tmp/brutus-railway.db';
    ensureSqliteDirectory(process.env.DATABASE_URL);
  }
}

setDefaultEnv('NODE_ENV', 'production');
setDefaultEnv('HOST', '0.0.0.0');
configureDatabaseUrl();
setDefaultEnv('JWT_SECRET', randomBytes(32).toString('base64'));

if (!process.env.CLIENT_ORIGIN && process.env.RAILWAY_PUBLIC_DOMAIN) {
  process.env.CLIENT_ORIGIN = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with ${signal ?? code}`));
    });
  });
}

await run('npx', ['prisma', 'migrate', 'deploy', '--schema=../prisma/schema.prisma']);
await run('node', ['dist/index.js']);
