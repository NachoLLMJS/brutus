// Porteado de LaBrute (`labrute/client/src/hooks/useRenderer.tsx`).
// Pool de hasta 3 renderers Pixi + caché por id, encolado por queue.

import { Extract, Renderer } from 'pixi.js';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import BruteDisplay from '@/lib/BruteDisplay';
import type { BruteGender } from 'core';

const MAX_RENDERERS = 3;

interface BruteData {
  id: string;
  gender: BruteGender;
  body: string;
  bodyColors: string;
}

type RenderMethod = (brute: BruteData) => void;
type RenderCallback = (content: string) => void;
type OnRenderMethod = (id: string, callback: RenderCallback) => void;

export interface RendererContextInterface {
  render: RenderMethod;
  onRender: OnRenderMethod;
  resetCache: (id: string) => void;
}

const RendererContext = React.createContext<RendererContextInterface>({
  render: () => {
    console.error('RendererContext.render() not implemented');
  },
  onRender: () => {
    console.error('RendererContext.onRender() not implemented');
  },
  resetCache: () => {
    console.error('RendererContext.resetCache() not implemented');
  },
});

export function useRenderer(): RendererContextInterface {
  return useContext(RendererContext);
}

interface RendererProviderProps {
  children: React.ReactNode;
}

type RendererInstance = {
  renderer: Renderer;
  busy: boolean;
};

type Cache = {
  id: string;
  content: string;
}[];

export function RendererProvider({ children }: RendererProviderProps) {
  const [queue, setQueue] = useState<BruteData[]>([]);
  const [renderers, setRenderers] = useState<RendererInstance[]>([]);
  const [cache, setCache] = useState<Cache>([]);
  const [callbacks, setCallbacks] = useState<Record<string, RenderCallback[]>>({});
  const isProcessingRef = useRef(false);

  const render: RenderMethod = useCallback((brute) => {
    setQueue((prev) => [...prev, brute]);
  }, []);

  const onRender: OnRenderMethod = useCallback((id, callback) => {
    setCallbacks((prev) => ({
      ...prev,
      [id]: [...(prev[id] ?? []), callback],
    }));
  }, []);

  const resetCache = useCallback((id: string) => {
    setCache((prev) => prev.filter((c) => c.id !== id));
  }, []);

  useEffect(() => {
    if (isProcessingRef.current) return;

    const request = queue[0];
    if (!request) return;

    const { body, bodyColors } = request;
    if (!body || !bodyColors) {
      // Skip: not a valid brute (still in setup). Drop from queue.
      setQueue((prev) => prev.slice(1));
      return;
    }

    const cached = cache.find((c) => c.id === request.id);
    if (cached) {
      setQueue((prev) => prev.slice(1));
      if (callbacks[request.id]) {
        for (const callback of callbacks[request.id] ?? []) {
          callback(cached.content);
        }
        setCallbacks((prev) => ({ ...prev, [request.id]: [] }));
      }
      return;
    }

    let freeRenderer = renderers.find((r) => !r.busy);

    if (!freeRenderer) {
      if (renderers.length < MAX_RENDERERS) {
        const renderer = new Renderer({
          backgroundAlpha: 0,
          width: 250,
          height: 320,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio * 2,
        });
        freeRenderer = { renderer, busy: false };
        setRenderers((prev) => [...prev, freeRenderer as RendererInstance]);
      } else {
        return;
      }
    }

    isProcessingRef.current = true;
    setQueue((prev) => prev.slice(1));
    freeRenderer.busy = true;

    const display = new BruteDisplay(request.gender, bodyColors, body, 'left', 1);

    display.onLoad(() => {
      if (!freeRenderer) {
        isProcessingRef.current = false;
        return;
      }

      display.container.width = Math.abs(display.container.width);
      display.container.height = Math.abs(display.container.height);

      const content = (freeRenderer.renderer.plugins.extract as Extract).image(
        display.container,
        'image/webp',
      );

      display.destroy();

      if (request.id) {
        setCache((prev) => [...prev, { id: request.id, content: content.src }]);
      }

      if (callbacks[request.id]) {
        for (const callback of callbacks[request.id] ?? []) {
          callback(content.src);
        }
        setCallbacks((prev) => ({ ...prev, [request.id]: [] }));
      }

      freeRenderer.busy = false;
      isProcessingRef.current = false;

      // Trigger next cycle
      setQueue((prev) => [...prev]);
    });
  }, [queue, renderers, cache, callbacks]);

  const methods = useMemo(
    () => ({ render, onRender, resetCache }),
    [render, onRender, resetCache],
  );

  return <RendererContext.Provider value={methods}>{children}</RendererContext.Provider>;
}
