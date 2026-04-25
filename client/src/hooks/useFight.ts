import { useEffect, useRef, useState, useCallback } from 'react';
import type { CombatStep } from 'core';

const DEFAULT_STEP_MS = 600;

interface UseFightOptions {
  log: CombatStep[];
  stepMs?: number;
  autoplay?: boolean;
}

interface UseFightResult {
  index: number;
  current: CombatStep | null;
  recent: CombatStep[];
  finished: boolean;
  playing: boolean;
  play: () => void;
  pause: () => void;
  skip: () => void;
  reset: () => void;
}

/**
 * Reproduce un combat log paso a paso. Pensado para FightViewer.
 * Mantiene una pequeña ventana de "recent" steps (últimos 5) para narración.
 */
export function useFight({
  log,
  stepMs = DEFAULT_STEP_MS,
  autoplay = true,
}: UseFightOptions): UseFightResult {
  const [index, setIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(autoplay);
  const timerRef = useRef<number | null>(null);

  const clear = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!playing) return;
    if (index >= log.length) return;
    timerRef.current = window.setTimeout(() => {
      setIndex((i) => Math.min(i + 1, log.length));
    }, stepMs);
    return () => {
      clear();
    };
  }, [playing, index, log.length, stepMs]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const skip = useCallback(() => {
    clear();
    setIndex(log.length);
    setPlaying(false);
  }, [log.length]);
  const reset = useCallback(() => {
    clear();
    setIndex(0);
    setPlaying(autoplay);
  }, [autoplay]);

  const current = index > 0 && index <= log.length ? (log[index - 1] ?? null) : null;
  const recent = log.slice(Math.max(0, index - 5), index);
  const finished = index >= log.length;

  return { index, current, recent, finished, playing, play, pause, skip, reset };
}
