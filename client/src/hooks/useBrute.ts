import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/api/apiClient';
import type { Brute } from 'core';

interface UseBruteResult {
  brute: Brute | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setBrute: (b: Brute) => void;
}

export function useBrute(id: string | undefined): UseBruteResult {
  const [brute, setBrute] = useState<Brute | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.brutes.get(id);
      setBrute(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { brute, loading, error, refresh, setBrute };
}
