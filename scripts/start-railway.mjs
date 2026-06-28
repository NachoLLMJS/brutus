#!/usr/bin/env node
import { spawn } from 'node:child_process';

// Railway production runs from the repository root. The server package is the
// canonical production entrypoint: it serves both the REST API and the built
// React client from client/dist. Starting the server for every Railway web
// service keeps production healthy even if the Railway service name/slug does
// not include "client" or "server".
const target = ['npm', ['run', 'start', '-w', 'server']];

console.log(`[start-railway] command=${target[0]} ${target[1].join(' ')}`);

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
