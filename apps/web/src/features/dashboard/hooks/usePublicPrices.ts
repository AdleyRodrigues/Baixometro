import { useCallback, useEffect, useState } from 'react';
import type { PublicPriceSearchItem } from '@baixometro/shared-types';
import { api } from '../../../api';

export function usePublicPrices(activeTab: 'radar' | 'community') {
  const [publicQuery, setPublicQuery] = useState('');
  const [publicPrices, setPublicPrices] = useState<PublicPriceSearchItem[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);

  const loadPublicPrices = useCallback(async (q: string) => {
    setLoadingPublic(true);
    try {
      const results = await api.searchPublicPrices(q.trim());
      setPublicPrices(results);
    } catch {
      setPublicPrices([]);
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'community') {
      const timer = setTimeout(() => {
        loadPublicPrices(publicQuery).catch(() => {});
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, publicQuery, loadPublicPrices]);

  return {
    publicQuery,
    setPublicQuery,
    publicPrices,
    loadingPublic,
    loadPublicPrices,
  };
}

