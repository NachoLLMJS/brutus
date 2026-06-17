// Settings persistidos del Lobby (Tablón de la fosa).
// Controlados desde el TweaksPanel. Se persisten en localStorage para que
// la preferencia del usuario sobreviva refrescos/cierres.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LobbyFilter = 'all' | 'near' | 'easy' | 'tough' | 'online';

interface LobbySettingsState {
  /** Si está activo, se filtran y muestran peleas de entrenamiento. */
  trainingMode: boolean;
  /** Filtro inicial al abrir el lobby. */
  defaultFilter: LobbyFilter;
  /** Mostrar la sidebar con tu bruto + lever de entrenamiento. */
  showSidebar: boolean;

  setTrainingMode: (v: boolean) => void;
  setDefaultFilter: (f: LobbyFilter) => void;
  setShowSidebar: (v: boolean) => void;
}

export const useLobbySettings = create<LobbySettingsState>()(
  persist(
    (set) => ({
      trainingMode: false,
      defaultFilter: 'all',
      showSidebar: true,
      setTrainingMode: (v) => set({ trainingMode: v }),
      setDefaultFilter: (f) => set({ defaultFilter: f }),
      setShowSidebar: (v) => set({ showSidebar: v }),
    }),
    {
      name: 'brutus.lobby.settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
