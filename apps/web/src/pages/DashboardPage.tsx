import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Compass,
  Loader2,
  Plus,
  QrCode,
  Search,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { DashboardPeriod } from '../api';
import { Button, buttonVariants } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../context/AuthContext';
import { CityRadarSection } from '../features/dashboard/components/CityRadarSection';
import { CommunityPricesTab } from '../features/dashboard/components/CommunityPricesTab';
import { DashboardKpiCards } from '../features/dashboard/components/DashboardKpiCards';
import { PriceAlertsBanner } from '../features/dashboard/components/PriceAlertsBanner';
import { ProductThermometerSection } from '../features/dashboard/components/ProductThermometerSection';
import { SpendingChartsSection } from '../features/dashboard/components/SpendingChartsSection';
import {
  StoreRankingItem,
  StoreRankingSection,
} from '../features/dashboard/components/StoreRankingSection';
import { useCityInsights } from '../features/dashboard/hooks/useCityInsights';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { usePublicPrices } from '../features/dashboard/hooks/usePublicPrices';
import { PERIOD_LABELS } from '../features/dashboard/types';
import { cn } from '../lib/utils';

export default function DashboardPage() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [viewMode, setViewMode] = useState<'radar' | 'personal'>('radar');
  const [activeTab, setActiveTab] = useState<'overview' | 'community'>('overview');

  // Hook do Radar Público por Cidade
  const {
    city,
    setCity,
    state,
    setState,
    insights,
    loading: loadingCity,
    error: errorCity,
    reload: reloadCity,
  } = useCityInsights();

  // Hook dos dados financeiros pessoais
  const {
    period,
    setPeriod,
    summary,
    alerts,
    loading: loadingPersonal,
    error: errorPersonal,
    productFilter,
    setProductFilter,
    productInsights,
    reload: reloadPersonal,
  } = useDashboardData();

  const {
    publicQuery,
    setPublicQuery,
    publicPrices,
    loadingPublic,
  } = usePublicPrices(activeTab === 'community' ? 'community' : 'radar');

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
      className="flex flex-col gap-5 pb-16"
    >
      {/* Banner de Modo Visitante */}
      {!isAuthenticated && (
        <div
          role="region"
          aria-label="Aviso de modo visitante"
          className="flex flex-col justify-between gap-3 rounded-xl border border-[#10b981]/35 bg-gradient-to-r from-[#10b981]/15 via-[#121215] to-[#121215] p-4 sm:flex-row sm:items-center"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-zinc-100">
              Você está no radar público do Baixômetro (Waze dos Preços).
            </p>
            <p className="text-xs text-zinc-400">
              Doe suas notas anonimamente para ajudar a comunidade ou crie uma conta para salvar seu histórico pessoal.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => openAuthModal({ defaultTab: 'register' })}
            className="shrink-0 gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>Criar Conta Grátis</span>
          </Button>
        </div>
      )}

      {/* Top Header & Modo de Visualização */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-zinc-50 truncate">
            {viewMode === 'radar' ? `Radar de Preços: ${city}, ${state}` : 'Minhas Finanças Pessoais'}
          </h1>
          <p className="text-xs text-zinc-400">
            {viewMode === 'radar'
              ? 'Crowdsourcing de preços e ranking dos mercados mais baratos da sua região'
              : `Acompanhe seus gastos, alertas e termômetro individual • ${PERIOD_LABELS[period]}`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Alternância entre Radar Público e Minhas Finanças (se logado) */}
          {isAuthenticated && (
            <Button
              type="button"
              variant={viewMode === 'personal' ? 'default' : 'secondary'}
              onClick={() => setViewMode((prev) => (prev === 'radar' ? 'personal' : 'radar'))}
              className="gap-2"
            >
              {viewMode === 'radar' ? (
                <>
                  <Wallet className="h-4 w-4 text-[#10b981]" />
                  <span>Ver Minhas Finanças</span>
                </>
              ) : (
                <>
                  <Compass className="h-4 w-4 text-[#10b981]" />
                  <span>Ver Radar Público</span>
                </>
              )}
            </Button>
          )}

          {/* Busca Pública Global */}
          <Button
            type="button"
            variant={activeTab === 'community' ? 'default' : 'secondary'}
            onClick={() =>
              setActiveTab((prev) => (prev === 'community' ? 'overview' : 'community'))
            }
          >
            <Search className="h-4 w-4 text-[#10b981]" />
            <span>Buscar Preços</span>
          </Button>

          {/* Período (apenas na visão pessoal) */}
          {viewMode === 'personal' && (
            <>
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
            </>
          )}

          <Link to="/receipts/new" className={cn(buttonVariants({ variant: 'default' }))}>
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Nova Nota</span>
          </Link>
        </div>
      </div>

      {/* Painel de Busca de Preços da Comunidade */}
      {activeTab === 'community' && (
        <CommunityPricesTab
          query={publicQuery}
          setQuery={setPublicQuery}
          prices={publicPrices}
          loading={loadingPublic}
        />
      )}

      {/* VISÃO 1: RADAR PÚBLICO DA CIDADE (Default) */}
      {viewMode === 'radar' && (
        <CityRadarSection
          city={city}
          state={state}
          onCityChange={setCity}
          onStateChange={setState}
          insights={insights}
          loading={loadingCity}
          error={errorCity}
          onReload={reloadCity}
        />
      )}

      {/* VISÃO 2: MINHAS FINANÇAS PESSOAIS (Somente se logado e selecionado) */}
      {viewMode === 'personal' && isAuthenticated && (
        <>
          {loadingPersonal && !summary && (
            <div className="flex flex-col gap-4" aria-label="Carregando finanças pessoais">
              <Skeleton className="h-[60px] w-full" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Skeleton className="h-[104px] w-full" />
                <Skeleton className="h-[104px] w-full" />
                <Skeleton className="h-[104px] w-full" />
              </div>
              <Skeleton className="h-[320px] w-full" />
            </div>
          )}

          {errorPersonal && (
            <Card className="p-5 space-y-4">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
                {errorPersonal}
              </div>
              <Button variant="secondary" onClick={reloadPersonal}>
                Tentar novamente
              </Button>
            </Card>
          )}

          {summary && (
            <>
              {loadingPersonal && (
                <div className="flex items-center justify-center gap-2 py-1 text-xs font-medium text-[#10b981]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Atualizando gastos...</span>
                </div>
              )}

              {/* 1. KPIs */}
              <DashboardKpiCards
                droppedOrLowestCount={droppedOrLowestCount}
                increasedCount={increasedCount}
                totalProducts={productInsights.length}
              />

              {/* 2. Termômetro de Preços */}
              <ProductThermometerSection
                productInsights={productInsights}
                productFilter={productFilter}
                setProductFilter={setProductFilter}
                droppedOrLowestCount={droppedOrLowestCount}
                increasedCount={increasedCount}
              />

              {/* 3. Alertas de Alta */}
              <PriceAlertsBanner alerts={alerts} />

              {/* 4. Ranking de Mercados */}
              <StoreRankingSection storePriceRanking={storePriceRanking} />

              {/* 5. Gráficos de Gastos */}
              <SpendingChartsSection summary={summary} />
            </>
          )}
        </>
      )}

      {/* Botão Flutuante (FAB) Grande e Verde para Escanear Nota */}
      <Link
        to="/receipts/new?scan=1"
        aria-label="Escanear Nota Fiscal"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-[#10b981] px-5 py-3.5 text-sm font-bold text-zinc-950 shadow-2xl shadow-emerald-500/30 ring-4 ring-[#10b981]/20 transition-all hover:scale-105 hover:bg-[#10b981]/90 focus:outline-none"
      >
        <QrCode className="h-5 w-5 stroke-[2.5]" />
        <span>Escanear Nota</span>
      </Link>
    </motion.div>
  );
}
