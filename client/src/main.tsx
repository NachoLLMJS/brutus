import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/App';
import '@/theme/global.css';

console.info('[brutus] client railway refresh: lpc-combat-2026-06-28');

const root = document.getElementById('root');
if (!root) throw new Error('No #root element in index.html');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
