// Settings del Landing (Forja la Leyenda).
// No se persisten: nada del juego queda guardado en localStorage.

import { create } from 'zustand';

export type HeroLayout = 'centered' | 'asym';
export type AccentIntensity = 'subdued' | 'balanced' | 'infernal';

interface LandingSettingsState {
  /** Layout del hero: centrado o asimétrico (skull izq + texto izq). */
  heroLayout: HeroLayout;
  /** Intensidad de glow rojo/dorado en el atmosphere. */
  accentIntensity: AccentIntensity;
  /** Mostrar reloj de torneo en el hero. */
  showClock: boolean;

  setHeroLayout: (v: HeroLayout) => void;
  setAccentIntensity: (v: AccentIntensity) => void;
  setShowClock: (v: boolean) => void;
}

export const useLandingSettings = create<LandingSettingsState>()((set) => ({
  heroLayout: 'centered',
  accentIntensity: 'balanced',
  showClock: true,
  setHeroLayout: (v) => set({ heroLayout: v }),
  setAccentIntensity: (v) => set({ accentIntensity: v }),
  setShowClock: (v) => set({ showClock: v }),
}));
