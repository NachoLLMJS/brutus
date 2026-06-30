// Settings del Combat (FightViewer).
// No se persisten: nada del juego queda guardado en localStorage.

import { create } from 'zustand';

interface CombatSettingsState {
  /** Si is activo, banners DOM "CRITICAL!"/"BLOCK!"/"DODGE!" sobre el canvas. */
  showActionBanner: boolean;
  /** Cuántos eventos del log mostrar (5..30). */
  logLength: number;

  setShowActionBanner: (v: boolean) => void;
  setLogLength: (n: number) => void;
}

export const useCombatSettings = create<CombatSettingsState>()((set) => ({
  showActionBanner: true,
  logLength: 14,
  setShowActionBanner: (v) => set({ showActionBanner: v }),
  setLogLength: (n) => set({ logLength: Math.max(5, Math.min(30, Math.round(n))) }),
}));
