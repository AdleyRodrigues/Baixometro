import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Plus, Search, UserPlus } from 'lucide-react';
import type { DashboardPeriod } from '../api';
import { Button, buttonVariants } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../context/AuthContext';
import { CommunityPricesTab } from '../features/dashboard/components/CommunityPricesTab';
import { DashboardKpiCards } from '../features/dashboard/components/DashboardKpiCards';
import { PriceAlertsBanner } from '../features/dashboard/components/PriceAlertsBanner';
import { ProductThermometerSection } from '../features/dashboard/components/ProductThermometerSection';
import { SpendingChartsSection } from '../features/dashboard/components/SpendingChartsSection';
import {
  StoreRankingItem,
  StoreRankingSection,
} from '../features/dashboard/components/StoreRankingSection';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { usePublicPrices } from '../features/dashboard/hooks/usePublicPrices';
import { PERIOD_LABELS } from '../features/dashboard/types';
import { cn } from '../lib/utils';

export default function DashboardPage() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'radar' | 'community'>('radar');

  const {
    period,
    setPeriod,
    summary,
    alerts,
    loading,
    error,
    productFilter,
    setProductFilter,
    productInsights,
    reload,
  } = useDashboardData();

  const {
    publicQuery,
    setPublicQuery,
    publicPrices,
    loadingPublic,
  } = usePublicPrices(activeTab);

  const storePriceRanking = useMemo<StoreRankingItem[]>(() => {
    if (!summary) return [];

    const cheapestByStore = new Map<
      string,
      { cheapestProducts: { name: string; price: number }[] }
    >();

    for (const item of productInsights) {
      if (item.observationCount > 0 && item.minStoreName) {
        const current = cheapestByStore.get(item.minStoreName) ?? { cheapestProducts: [] };
        current.cheapestProducts.push({
          name: item.product.name,
          price: item.minUnitPrice,
        });
        cheapestByStore.set(item.minStoreName, current);
      }
    }

    return summary.by_store
      .map((store) => {
        const cheapest = cheapestByStore.get(store.name)?.cheapestProducts ?? [];
        return {
          ...store,
          cheapestCount: cheapest.length,
          cheapestProducts: cheapest,
        };
      })
      .sort((a, b) => {
        if (b.cheapestCount !== a.cheapestCount) {
          return b.cheapestCount - a.cheapestCount;
        }
        return a.total - b.total;
      });
  }, [summary, productInsights]);

  if (loading && !summary) {
    return (
      <div className="flex flex-col gap-4" aria-label="Carregando radar de preços">
        <Skeleton className="h-[60px] w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
        </div>
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[220px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-5 space-y-4">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
          {error}
        </div>
        <Button variant="secondary" onClick={reload}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  if (!summary) return null;

  const droppedOrLowestCount = productInsights.filter(
    (p) => p.status === 'dropped' || p.status === 'lowest',
  ).length;
  const increasedCount = Math.max(
    alerts.length,
    productInsights.filter((p) => p.status === 'increased').length,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {/* Banner do Modo Visitante */}
      {!isAuthenticated && (
        <div
          role="region"
          aria-label="Aviso de modo visitante"
          className="flex flex-col justify-between gap-3 rounded-xl border border-[#10b981]/35 bg-gradient-to-r from-[#10b981]/15 via-[#121215] to-[#121215] p-4 sm:flex-row sm:items-center"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-zinc-100">
              Você está no modo visitante. Crie uma conta para salvar seu histórico.
            </p>
            <p className="text-xs text-zinc-400">
              Você pode testar a leitura de notas (QR Code ou XML) e buscar preços da comunidade livremente.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => openAuthModal({ defaultTab: 'register' })}
            className="shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Criar Conta</span>
          </Button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-50">
            Radar de Preços dos Produtos
          </h1>
          <p className="text-xs text-zinc-400">
            Acompanhe se os produtos baixaram ou subiram de preço nos mercados • {PERIOD_LABELS[period]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={activeTab === 'community' ? 'default' : 'secondary'}
            onClick={() =>
              setActiveTab((prev) => (prev === 'community' ? 'radar' : 'community'))
            }
          >
            <Search className="h-4 w-4 text-[#10b981]" />
            <span>Buscar Preços</span>
          </Button>

          <label htmlFor="period-select" className="sr-only">
            Período
          </label>
          <Select
            id="period-select"
            name="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
          >
            <option value="3m">Últimos 3 meses</option>
            <option value="month">Mês Atual</option>
            <option value="year">Ano</option>
          </Select>

          <Link to="/receipts/new" className={cn(buttonVariants({ variant: 'default' }))}>
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Nova Nota</span>
          </Link>
        </div>
      </div>

      {/* Painel de Busca Pública de Preços da Comunidade (Crowdsourcing - Fase 12) */}
      {activeTab === 'community' && (
        <CommunityPricesTab
          query={publicQuery}
          setQuery={setPublicQuery}
          prices={publicPrices}
          loading={loadingPublic}
        />
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs font-medium text-[#10b981]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Atualizando preços...</span>
        </div>
      )}

      {/* 1. KPIs DE PREÇOS DOS PRODUTOS */}
      <DashboardKpiCards
        droppedOrLowestCount={droppedOrLowestCount}
        increasedCount={increasedCount}
        totalProducts={productInsights.length}
      />

      {/* 2. TERMÔMETRO DE PREÇOS POR PRODUTO */}
      <ProductThermometerSection
        productInsights={productInsights}
        productFilter={productFilter}
        setProductFilter={setProductFilter}
        droppedOrLowestCount={droppedOrLowestCount}
        increasedCount={increasedCount}
      />

      {/* 3. ALERTAS DE ALTA > 10% */}
      <PriceAlertsBanner alerts={alerts} />

      {/* 4. RANKING DE MERCADOS */}
      <StoreRankingSection storePriceRanking={storePriceRanking} />

      {/* 5. RESUMO DE GASTOS PESSOAIS & CATEGORIAS */}
      <SpendingChartsSection summary={summary} />
    </motion.div>
  );
}
