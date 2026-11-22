import { useCallback, useEffect, useState } from 'react';
import type { PublicCityInsights } from '@baixometro/shared-types';
import { api } from '../../../api';

export const STORAGE_KEY_CITY = 'baixometro_selected_city';
export const STORAGE_KEY_STATE = 'baixometro_selected_state';

export const DEFAULT_CITY = 'São Paulo';
export const DEFAULT_STATE = 'SP';

export function useCityInsights() {
  const [city, setCityState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_CITY;
    return localStorage.getItem(STORAGE_KEY_CITY) || DEFAULT_CITY;
  });

  const [state, setStateValue] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    return localStorage.getItem(STORAGE_KEY_STATE) || DEFAULT_STATE;
  });

  const [insights, setInsights] = useState<PublicCityInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCity = useCallback((newCity: string) => {
    setCityState(newCity);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CITY, newCity);
    }
  }, []);

  const setState = useCallback((newState: string) => {
    const formatted = newState.trim().toUpperCase().slice(0, 2);
    setStateValue(formatted);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STATE, formatted);
    }
  }, []);

  const fetchInsights = useCallback(async (c: string, s: string) => {
    if (!c.trim() || !s.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPublicInsights(c.trim(), s.trim());
      setInsights(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os dados públicos da cidade selecionada.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights(city, state).catch(() => {});
  }, [city, state, fetchInsights]);

  const reload = useCallback(() => {
    fetchInsights(city, state).catch(() => {});
  }, [city, state, fetchInsights]);

  return {
    city,
    setCity,
    state,
    setState,
    insights,
    loading,
    error,
    reload,
  };
}

