import { create } from 'zustand';
import type { FightResponse } from '@/api/apiClient';
import type { LevelUpOffer } from 'core';

export interface RecentBrute {
  id: string;
  name: string;
  level: number;
}

/**
 * Offer pendiente atado a un bruto específico — persistido en localStorage
 * para sobrevivir a refresh / cierre de pestaña entre la pelea y el Profile.
 */
export interface PendingLevelUp {
  bruteId: string;
  offer: LevelUpOffer;
}

interface GameState {
  currentBruteId: string | null;
  recentBrutes: RecentBrute[];
  /** Estado ephemeral del último combate (no persistido). */
  lastFight: FightResponse | null;
  /** Level-up pendiente — persiste hasta que el usuario aplique un choice. */
  pendingLevelUp: PendingLevelUp | null;
  setCurrentBrute: (id: string | null) => void;
  rememberBrute: (b: RecentBrute) => void;
  forgetBrute: (id: string) => void;
  resetSession: () => void;
  setLastFight: (f: FightResponse | null) => void;
  setPendingLevelUp: (p: PendingLevelUp | null) => void;
}

export const useGameStore = create<GameState>()((set) => ({
  currentBruteId: null,
  recentBrutes: [],
  lastFight: null,
  pendingLevelUp: null,
  setCurrentBrute: (id) => set({ currentBruteId: id }),
  rememberBrute: (b) =>
    set((state) => {
      const without = state.recentBrutes.filter((r) => r.id !== b.id);
      return { recentBrutes: [b, ...without] };
    }),
  forgetBrute: (id) =>
    set((state) => ({
      recentBrutes: state.recentBrutes.filter((r) => r.id !== id),
      currentBruteId: state.currentBruteId === id ? null : state.currentBruteId,
      pendingLevelUp:
        state.pendingLevelUp?.bruteId === id ? null : state.pendingLevelUp,
    })),
  resetSession: () => set({ currentBruteId: null, recentBrutes: [], lastFight: null, pendingLevelUp: null }),
  setLastFight: (f) => set({ lastFight: f }),
  setPendingLevelUp: (p) => set({ pendingLevelUp: p }),
}));
