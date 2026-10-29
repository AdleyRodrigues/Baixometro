import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DashboardSummary,
  PriceAlert,
  Product,
  ProductPriceHistory,
} from '@baixometro/shared-types';
import { api, type DashboardPeriod } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { createEmptyDashboardSummary, type ProductPriceInsight } from '../types';

export function useDashboardData() {
  const { isAuthenticated } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>('3m');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [histories, setHistories] = useState<Record<string, ProductPriceHistory>>({});
  const [productFilter, setProductFilter] = useState<'all' | 'dropped' | 'increased'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (selectedPeriod: DashboardPeriod) => {
      if (!isAuthenticated) {
        setSummary(createEmptyDashboardSummary(selectedPeriod));
        setAlerts([]);
        setProducts([]);
        setHistories({});
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [summaryData, alertsData, prodList] = await Promise.all([
          api.getDashboardSummary(selectedPeriod),
          api.getAlerts().catch(() => [] as PriceAlert[]),
          api.getProducts().catch(() => [] as Product[]),
        ]);

        const historyEntries = await Promise.all(
          prodList.map(async (p) => {
            try {
              const h = await api.getProductHistory(p.id);
              return [p.id, h] as const;
            } catch {
              return null;
            }
          }),
        );

        const historyMap: Record<string, ProductPriceHistory> = {};
        for (const entry of historyEntries) {
          if (entry) {
            historyMap[entry[0]] = entry[1];
          }
        }

        setSummary(summaryData);
        setAlerts(alertsData);
        setProducts(prodList);
        setHistories(historyMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar o resumo');
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    load(period).catch(() => {});
  }, [period, load]);

  const productInsights = useMemo<ProductPriceInsight[]>(() => {
    return products
      .map((product) => {
        const hist = histories[product.id];
        const obs = hist?.observations ?? [];
        if (obs.length === 0) {
          return {
            product,
            observationCount: 0,
            latestUnitPrice: 0,
            latestStoreName: 'Sem registro',
            previousUnitPrice: 0,
            minUnitPrice: 0,
            minStoreName: '—',
            variationPct: 0,
            status: 'lowest' as const,
          };
        }

        const latest = obs[obs.length - 1];
        const previousList = obs.slice(0, -1);
        const previousAvg =
          previousList.length > 0
            ? previousList.reduce((acc, item) => acc + item.unit_price, 0) / previousList.length
            : latest.unit_price;

        const minObs = obs.reduce((best, cur) =>
          cur.unit_price < best.unit_price ? cur : best,
        );

        const variationPct =
          previousList.length > 0 && previousAvg > 0
            ? Math.round(((latest.unit_price - previousAvg) / previousAvg) * 1000) / 10
            : 0;

        let status: 'dropped' | 'increased' | 'lowest' = 'lowest';
        if (variationPct < -0.5) {
          status = 'dropped';
        } else if (variationPct > 0.5) {
          status = 'increased';
        }

        return {
          product,
          observationCount: obs.length,
          latestUnitPrice: latest.unit_price,
          latestStoreName: latest.store_name,
          previousUnitPrice: previousAvg,
          minUnitPrice: minObs.unit_price,
          minStoreName: minObs.store_name,
          variationPct,
          status,
        };
      })
      .sort((a, b) => b.observationCount - a.observationCount);
  }, [products, histories]);

  const droppedCount = productInsights.filter((i) => i.status === 'dropped').length;
  const increasedCount = productInsights.filter((i) => i.status === 'increased').length;

  const filteredInsights = useMemo(() => {
    if (productFilter === 'dropped') {
      return productInsights.filter((i) => i.status === 'dropped');
    }
    if (productFilter === 'increased') {
      return productInsights.filter((i) => i.status === 'increased');
    }
    return productInsights;
  }, [productInsights, productFilter]);

  return {
    period,
    setPeriod,
    summary,
    alerts,
    loading,
    error,
    productFilter,
    setProductFilter,
    productInsights,
    filteredInsights,
    droppedCount,
    increasedCount,
    reload: () => load(period),
  };
}

