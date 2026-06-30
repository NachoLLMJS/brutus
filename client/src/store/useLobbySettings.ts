// Settings del Lobby (Board de la fosa).
// No se persisten: nada del juego queda guardado en localStorage.

import { create } from 'zustand';

export type LobbyFilter = 'all' | 'near' | 'easy' | 'tough' | 'online';

interface LobbySettingsState {
  /** Si is activo, se filtran y muestran fights de entrenamiento. */
  trainingMode: boolean;
  /** Filtro inicial to abrir el lobby. */
  defaultFilter: LobbyFilter;
  /** Mostrar la sidebar con tu bruto + lever de entrenamiento. */
  showSidebar: boolean;

  setTrainingMode: (v: boolean) => void;
  setDefaultFilter: (f: LobbyFilter) => void;
  setShowSidebar: (v: boolean) => void;
}

export const useLobbySettings = create<LobbySettingsState>()((set) => ({
  trainingMode: false,
  defaultFilter: 'all',
  showSidebar: true,
  setTrainingMode: (v) => set({ trainingMode: v }),
  setDefaultFilter: (f) => set({ defaultFilter: f }),
  setShowSidebar: (v) => set({ showSidebar: v }),
}));
