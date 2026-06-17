// Settings persistidos del Profile v2 (Templo personal).
// Controlados desde el TweaksPanel del Profile.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ProfileSettingsState {
  /** Si está activo, el background portrait emite glow rojo. */
  portraitGlow: boolean;
  /** Cuántas bestias mostrar (0..3). */
  beastCount: number;
  /** Mostrar o no el panel de Linaje (lore corto). */
  showLineage: boolean;

  setPortraitGlow: (v: boolean) => void;
  setBeastCount: (n: number) => void;
  setShowLineage: (v: boolean) => void;
}

export const useProfileSettings = create<ProfileSettingsState>()(
  persist(
    (set) => ({
      portraitGlow: true,
      beastCount: 2,
      showLineage: true,
      setPortraitGlow: (v) => set({ portraitGlow: v }),
      setBeastCount: (n) => set({ beastCount: Math.max(0, Math.min(3, Math.round(n))) }),
      setShowLineage: (v) => set({ showLineage: v }),
    }),
    {
      name: 'brutus.profile.settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
