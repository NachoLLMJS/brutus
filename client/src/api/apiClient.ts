/**
 * Wrapper tipado del fetch al server Brutus.
 * - Base: /api (proxiado por Vite a http://127.0.0.1:3001 en dev).
 * - Manejo de errores: si la respuesta es no-2xx, lanza ApiError con
 *   `code` recibido en el JSON ({ error: 'CODE', message? }).
 *
 * Shape alineado con server: cuando POST /fights se llama sin opponentId,
 * el server retorna { opponents }; con opponentId, retorna FightResponse.
 */

import type {
  Brute,
  Appearance,
  CombatStep,
  LevelUpChoice,
  LevelUpOffer,
  FightLog,
} from 'core';

const API_BASE = '/api';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface ErrorBody {
  error?: string;
  message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let body: ErrorBody = {};
    try {
      body = (await res.json()) as ErrorBody;
    } catch {
      // ignore
    }
    throw new ApiError(body.error ?? 'UNKNOWN', res.status, body.message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------- Tipos de payload ----------

export interface CreateBruteBody {
  name: string;
  appearance?: Appearance;
  masterId?: string;
  // Renderer Pixi (opcional)
  gender?: 'male' | 'female';
  body?: string;
  bodyColors?: string;
  walletAddress: string;
  onChainBruteId?: number;
  createTxHash?: string;
}

export interface FightBody {
  opponentId: string;
  training?: boolean;
}

// Shape real devuelto por POST /fights con opponentId.
export interface FightResponse {
  combat: {
    id: string;
    winner: 'A' | 'B';
    log: CombatStep[];
    duration: number;
    fightType: 'normal' | 'training';
    opponent: { id: string; name: string };
    fightLog: FightLog;
    reward?: {
      eligible: boolean;
      fightId?: string;
      winnerWallet?: string;
      recordedTxHash?: string;
      reason?: string;
    };
  };
  brute: Brute;
  leveledUp: boolean;
  levelUpChoices?: LevelUpOffer;
  dayEnded: boolean;
}

// Shape devuelto por POST /fights sin opponentId.
interface OpponentsEnvelope {
  opponents: Brute[];
}

export interface LevelUpBody {
  choice: LevelUpChoice;
}

/**
 * Shape devuelto por POST /tournaments. Matchea `TournamentRunResult` del
 * server (`server/src/services/TournamentService.ts`).
 */
export interface TournamentBrute {
  id: string;
  name: string;
  gender: 'male' | 'female';
  body: string;
  bodyColors: string;
  maxHp: number;
}

export interface TournamentMatch {
  a: TournamentBrute;
  b: TournamentBrute;
  winner: 'A' | 'B';
  duration: number;
  fightLog: FightLog;
}

export interface TournamentRound {
  round: number;
  matches: TournamentMatch[];
}

export interface TournamentResponse {
  id: string;
  rounds: TournamentRound[];
  champion: { id: string; name: string };
  ascended: boolean;
}

// ---------- API surface ----------

export const api = {
  brutes: {
    list: (): Promise<Brute[]> => request('/brutes'),

    create: (body: CreateBruteBody): Promise<Brute> =>
      request('/brutes', { method: 'POST', body: JSON.stringify(body) }),

    get: (id: string): Promise<Brute> => request(`/brutes/${encodeURIComponent(id)}`),

    pupils: async (id: string): Promise<Brute[]> => {
      const res = await request<{ pupils: Brute[] }>(
        `/brutes/${encodeURIComponent(id)}/pupils`,
      );
      return res.pupils;
    },

    /** Pide 3 oponentes sugeridos (POST a /fights sin opponentId). */
    opponents: async (id: string, training = false): Promise<Brute[]> => {
      const res = await request<OpponentsEnvelope>(
        `/brutes/${encodeURIComponent(id)}/fights`,
        {
          method: 'POST',
          body: JSON.stringify({ fightType: training ? 'training' : 'normal' }),
        },
      );
      return res.opponents;
    },

    /** Pelea contra un oponente específico. */
    fight: (id: string, body: FightBody): Promise<FightResponse> =>
      request(`/brutes/${encodeURIComponent(id)}/fights`, {
        method: 'POST',
        body: JSON.stringify({
          fightType: body.training ? 'training' : 'normal',
          opponentId: body.opponentId,
        }),
      }),

    tournament: (id: string): Promise<TournamentResponse> =>
      request(`/brutes/${encodeURIComponent(id)}/tournaments`, { method: 'POST' }),

    levelup: (id: string, body: LevelUpBody): Promise<Brute> =>
      request(`/brutes/${encodeURIComponent(id)}/levelup`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
};
