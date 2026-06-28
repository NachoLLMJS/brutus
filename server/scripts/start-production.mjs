#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

function setDefaultEnv(name, value) {
  if (!process.env[name] || process.env[name].trim() === '') {
    process.env[name] = value;
    console.warn(`[start-production] ${name} was not set; using fallback ${value.startsWith('file:') ? value : '<generated>'}`);
  }
}

setDefaultEnv('NODE_ENV', 'production');
setDefaultEnv('HOST', '0.0.0.0');
setDefaultEnv('DATABASE_URL', 'file:/tmp/brutus-railway.db');
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
