// Settings persistidos del Landing (Forja la Leyenda).
// Controlados desde el TweaksPanel del Landing.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type HeroLayout = 'centered' | 'asym';
export type AccentIntensity = 'subdued' | 'balanced' | 'infernal';

interface LandingSettingsState {
  /** Layout del hero: centrado o asimétrico (skull izq + texto izq). */
  heroLayout: HeroLayout;
  /** Cuántas warrior cards mostrar (3 o 6). */
  warriorCount: number;
  /** Intensidad de glow rojo/dorado en el atmosphere. */
  accentIntensity: AccentIntensity;
  /** Mostrar reloj de torneo en el hero. */
  showClock: boolean;

  setHeroLayout: (v: HeroLayout) => void;
  setWarriorCount: (n: number) => void;
  setAccentIntensity: (v: AccentIntensity) => void;
  setShowClock: (v: boolean) => void;
}

export const useLandingSettings = create<LandingSettingsState>()(
  persist(
    (set) => ({
      heroLayout: 'centered',
      warriorCount: 6,
      accentIntensity: 'balanced',
      showClock: true,
      setHeroLayout: (v) => set({ heroLayout: v }),
      setWarriorCount: (n) => set({ warriorCount: n === 3 ? 3 : 6 }),
      setAccentIntensity: (v) => set({ accentIntensity: v }),
      setShowClock: (v) => set({ showClock: v }),
    }),
    {
      name: 'brutus.landing.settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
