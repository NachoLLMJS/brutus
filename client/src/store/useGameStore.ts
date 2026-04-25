import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FightResponse } from '@/api/apiClient';
import type { LevelUpOffer } from 'core';

export interface RecentBrute {
  id: string;
  name: string;
  level: number;
}

interface GameState {
  currentBruteId: string | null;
  recentBrutes: RecentBrute[];
  // Ephemeral (no persistence) — handed off between Arena → FightViewer → LevelUp.
  lastFight: FightResponse | null;
  lastLevelUpOffer: LevelUpOffer | null;
  setCurrentBrute: (id: string | null) => void;
  rememberBrute: (b: RecentBrute) => void;
  forgetBrute: (id: string) => void;
  setLastFight: (f: FightResponse | null) => void;
  setLastLevelUpOffer: (o: LevelUpOffer | null) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      currentBruteId: null,
      recentBrutes: [],
      lastFight: null,
      lastLevelUpOffer: null,
      setCurrentBrute: (id) => set({ currentBruteId: id }),
      rememberBrute: (b) =>
        set((state) => {
          const without = state.recentBrutes.filter((r) => r.id !== b.id);
          return { recentBrutes: [b, ...without].slice(0, 8) };
        }),
      forgetBrute: (id) =>
        set((state) => ({
          recentBrutes: state.recentBrutes.filter((r) => r.id !== id),
          currentBruteId: state.currentBruteId === id ? null : state.currentBruteId,
        })),
      setLastFight: (f) => set({ lastFight: f }),
      setLastLevelUpOffer: (o) => set({ lastLevelUpOffer: o }),
    }),
    {
      name: 'brutus.recent',
      storage: createJSONStorage(() => localStorage),
      // sólo guardamos id+name+level (no datos sensibles, no datos efímeros)
      partialize: (s) => ({
        currentBruteId: s.currentBruteId,
        recentBrutes: s.recentBrutes,
      }),
    },
  ),
);
