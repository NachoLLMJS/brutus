#!/usr/bin/env node
import { spawn } from 'node:child_process';

const serviceName = (
  process.env.RAILWAY_SERVICE_NAME ||
  process.env.RAILWAY_SERVICE_SLUG ||
  process.env.RAILWAY_SERVICE_ID ||
  ''
).toLowerCase();

const isClientService = serviceName.includes('client');
const target = isClientService ? ['npm', ['run', 'start', '-w', 'client']] : ['npm', ['run', 'start', '-w', 'server']];

console.log(`[start-railway] service=${serviceName || '<unknown>'} command=${target[0]} ${target[1].join(' ')}`);

const child = spawn(target[0], target[1], {
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

child.on('error', (error) => {
  console.error('[start-railway] failed to spawn:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
