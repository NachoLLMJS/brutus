import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // brutus-fla-parser es un fork local de labrute-fla-parser. El Symbols.js
  // es CommonJS (`exports.SymbolX = ...`) y al vivir en /packages (workspace)
  // Vite no lo pre-bundlea automáticamente. Lo forzamos para que
  // esbuild/rollup lo conviertan a ESM consumible por nuestros imports.
  optimizeDeps: {
    include: ['brutus-fla-parser'],
  },
  build: {
    commonjsOptions: {
      include: [/brutus-fla-parser/, /node_modules/],
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
});
