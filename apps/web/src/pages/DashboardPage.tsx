import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  Receipt,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DashboardSummary,
  PriceAlert,
  Product,
  ProductPriceHistory,
} from '@baixometro/shared-types';
import { api, type DashboardPeriod } from '../api';
import { Badge } from '../components/ui/badge';
import { Button, buttonVariants } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Select } from '../components/ui/select';
import { formatCurrency, formatMonthYear } from '../format';
import { cn } from '../lib/utils';

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  month: 'Mês Atual',
  '3m': 'Últimos 3 meses',
  year: 'Ano',
};

const DONUT_PALETTE = ['#10b981', '#34d399', '#059669', '#3b82f6', '#6366f1'];

interface ChartTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  metricLabel?: string;
}

function CustomChartTooltip({
  active,
  payload,
  label,
  metricLabel = 'Total',
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const numericValue = typeof item.value === 'number' ? item.value : 0;

  return (
    <div className="rounded-xl border border-[#27272a] bg-[#121215]/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-md">
      {label && (
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          {label}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full bg-[#10b981]" />
        <span className="text-zinc-300">{item.name || metricLabel}:</span>
        <span className="font-semibold text-zinc-50">{formatCurrency(numericValue)}</span>
      </div>
    </div>
  );
}

interface ProductPriceInsight {
  product: Product;
  observationCount: number;
  latestUnitPrice: number;
  latestStoreName: string;
  previousUnitPrice: number;
  minUnitPrice: number;
  minStoreName: string;
  variationPct: number;
  status: 'dropped' | 'increased' | 'lowest';
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [histories, setHistories] = useState<Record<string, ProductPriceHistory>>({});
  const [productFilter, setProductFilter] = useState<'all' | 'dropped' | 'increased'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selectedPeriod: DashboardPeriod) => {
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
  }, []);

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
      .sort((a, b) => Math.abs(b.variationPct) - Math.abs(a.variationPct));
  }, [products, histories]);

  // Ranking de mercados onde os produtos monitorados têm o MENOR preço unitário
  const storePriceRanking = useMemo(() => {
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
      <Card className="flex items-center justify-center gap-2.5 py-12 text-sm font-medium text-[#10b981]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Carregando radar de preços...</span>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5 space-y-4">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
          {error}
        </div>
        <Button variant="secondary" onClick={() => load(period)}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  if (!summary) return null;

  const totalMonth = summary.total_month;
  const droppedOrLowestCount = productInsights.filter(
    (p) => p.status === 'dropped' || p.status === 'lowest',
  ).length;
  const increasedCount = Math.max(
    alerts.length,
    productInsights.filter((p) => p.status === 'increased').length,
  );

  const filteredProducts = productInsights.filter((item) => {
    if (productFilter === 'dropped') return item.status === 'dropped' || item.status === 'lowest';
    if (productFilter === 'increased') return item.status === 'increased';
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
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

        <div className="flex items-center gap-2">
          <label htmlFor="period-select" className="sr-only">
            Período
          </label>
          <Select
            id="period-select"
            name="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
          >
            <option value="month">Mês Atual</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="year">Ano</option>
          </Select>

          <Link to="/receipts/new" className={cn(buttonVariants({ variant: 'default' }))}>
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Nova Nota</span>
          </Link>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs font-medium text-[#10b981]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Atualizando preços...</span>
        </div>
      )}

      {/* 1. KPIs DE PREÇOS DOS PRODUTOS (Prioridade #1) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4 border-[#10b981]/30 bg-gradient-to-br from-[#10b981]/10 via-[#121215] to-[#121215]">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span className="uppercase tracking-wider">Em Queda / Menor Preço</span>
            <TrendingDown className="h-4 w-4 text-[#10b981]" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#10b981]">
            {droppedOrLowestCount} {droppedOrLowestCount === 1 ? 'produto' : 'produtos'}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Com preço baixo ou estável no período
          </div>
        </Card>

        <Card
          className={cn(
            'p-4',
            increasedCount > 0 &&
              'border-amber-500/35 bg-gradient-to-br from-amber-950/20 via-[#121215] to-[#121215]',
          )}
        >
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span className="uppercase tracking-wider">Subiram de Preço</span>
            <TrendingUp
              className={cn('h-4 w-4', increasedCount > 0 ? 'text-amber-400' : 'text-zinc-400')}
            />
          </div>
          <div
            className={cn(
              'mt-2 text-2xl font-bold tracking-tight',
              increasedCount > 0 ? 'text-amber-400' : 'text-zinc-50',
            )}
          >
            {increasedCount} {increasedCount === 1 ? 'produto' : 'produtos'}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {increasedCount > 0
              ? 'Acima da média das compras anteriores'
              : 'Nenhum aumento detectado'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span className="uppercase tracking-wider">Produtos Monitorados</span>
            <Package className="h-4 w-4 text-[#10b981]" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-50">
            {products.length} {products.length === 1 ? 'item' : 'itens'}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Comparados por preço unitário
          </div>
        </Card>
      </div>

      {/* 2. TERMÔMETRO DE PREÇOS POR PRODUTO (Baixaram vs. Subiram — Preço Unitário em destaque) */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[#10b981]" />
              <span>Termômetro de Preços por Produto (Preço Unitário)</span>
            </CardTitle>
            <CardDescription>
              Veja se cada produto baixou ou subiu de preço e em qual mercado está mais barato
            </CardDescription>
          </div>

          <div className="inline-flex items-center rounded-xl border border-[#27272a] bg-[#09090b] p-1">
            <Button
              type="button"
              size="sm"
              variant={productFilter === 'all' ? 'default' : 'ghost'}
              className="h-7 px-2.5 text-xs"
              onClick={() => setProductFilter('all')}
            >
              Todos ({productInsights.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={productFilter === 'dropped' ? 'default' : 'ghost'}
              className="h-7 px-2.5 text-xs"
              onClick={() => setProductFilter('dropped')}
            >
              Menor Preço ({droppedOrLowestCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={productFilter === 'increased' ? 'default' : 'ghost'}
              className="h-7 px-2.5 text-xs"
              onClick={() => setProductFilter('increased')}
            >
              Subiram ({increasedCount})
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {filteredProducts.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-400">
              Nenhum produto encontrado neste filtro.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredProducts.map((item) => {
                const isIncreased = item.status === 'increased';
                const isDropped = item.status === 'dropped';

                return (
                  <Link
                    key={item.product.id}
                    to={`/products/${item.product.id}`}
                    className={cn(
                      'group flex flex-col gap-2.5 rounded-xl border px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between',
                      isIncreased
                        ? 'border-red-500/30 bg-red-950/10 hover:border-red-500/50 hover:bg-[#18181b]'
                        : 'border-[#27272a]/90 bg-[#09090b]/70 hover:border-[#10b981]/45 hover:bg-[#18181b]',
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-100 group-hover:text-white">
                          {item.product.name}
                        </span>
                        {isDropped && (
                          <Badge variant="default" className="gap-1">
                            <TrendingDown className="h-3 w-3" />
                            <span>Baixou {Math.abs(item.variationPct)}%</span>
                          </Badge>
                        )}
                        {isIncreased && (
                          <Badge variant="destructive" className="gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>Subiu +{item.variationPct}%</span>
                          </Badge>
                        )}
                        {!isDropped && !isIncreased && item.observationCount > 0 && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Menor Preço</span>
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                        <span>
                          Menor preço:{' '}
                          <strong className="text-[#10b981]">
                            {formatCurrency(item.minUnitPrice)} un.
                          </strong>{' '}
                          ({item.minStoreName})
                        </span>
                        {item.observationCount > 1 && (
                          <span>
                            • Média anterior: {formatCurrency(item.previousUnitPrice)} un.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-zinc-400">Último Preço Unitário</div>
                        <div
                          className={cn(
                            'text-base font-bold',
                            isIncreased ? 'text-red-400' : 'text-[#10b981]',
                          )}
                        >
                          {formatCurrency(item.latestUnitPrice)}{' '}
                          <span className="text-xs font-normal text-zinc-400">un.</span>
                        </div>
                        <div className="text-[11px] text-zinc-400">{item.latestStoreName}</div>
                      </div>

                      <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-500 group-hover:text-[#10b981] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. ALERTAS DE ALTA > 10% (Destaque de atenção quando houver) */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/35 bg-gradient-to-br from-amber-950/20 via-[#121215] to-[#121215]">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Atenção: Produtos que Subiram Mais de 10%</span>
              </CardTitle>
              <CardDescription>
                Comparação da última compra com a média dos últimos 30 dias
              </CardDescription>
            </div>
            <Badge variant="destructive">{alerts.length} em alta</Badge>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-2">
              {alerts.map((alert) => (
                <Link
                  key={alert.product_id}
                  to={`/products/${alert.product_id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-red-500/25 bg-[#09090b]/80 px-3.5 py-2.5 transition-colors hover:border-red-500/45 hover:bg-[#18181b]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-100 group-hover:text-white">
                      {alert.product_name}
                    </div>
                    <div className="text-xs text-zinc-400">
                      Comprado em <strong>{alert.store_name}</strong>
                    </div>
                  </div>

                  <Badge variant="destructive" className="shrink-0 font-bold">
                    <TrendingUp className="h-3 w-3" />+{alert.variation_pct}%
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. RANKING DE MERCADOS: ONDE OS PRODUTOS ESTÃO MAIS BARATOS */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#10b981]" />
              <span>Onde Comprar Mais Barato (Comparativo de Mercados)</span>
            </CardTitle>
            <CardDescription>
              Mercados ordenados pela quantidade de produtos com o menor preço unitário registrado
            </CardDescription>
          </div>
          <Link
            to="/receipts"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#10b981] hover:text-emerald-400 transition-colors shrink-0"
          >
            <span>Ver notas</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>

        <CardContent>
          {storePriceRanking.length === 0 ? (
            <p className="text-xs text-zinc-400">
              Nenhum mercado movimentado neste período.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {storePriceRanking.map((store, idx) => (
                <div
                  key={store.store_id}
                  className={cn(
                    'flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
                    store.cheapestCount > 0 && idx === 0
                      ? 'border-[#10b981]/35 bg-[#10b981]/5'
                      : 'border-[#27272a]/80 bg-[#09090b]/60',
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Store className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-semibold text-zinc-100">{store.name}</span>
                      {store.cheapestCount > 0 ? (
                        <Badge variant="default">
                          {store.cheapestCount === 1
                            ? '1 produto mais barato aqui'
                            : `${store.cheapestCount} produtos mais baratos aqui`}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Sem menor preço atual</Badge>
                      )}
                    </div>

                    {store.cheapestProducts.length > 0 ? (
                      <div className="text-xs text-zinc-300">
                        <span className="text-zinc-400">Menor preço em: </span>
                        {store.cheapestProducts
                          .map((p) => `${p.name} (${formatCurrency(p.price)} un.)`)
                          .join(' • ')}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500">
                        Os produtos comprados aqui estavam mais baratos em outro mercado
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#27272a]/60 pt-2 text-left sm:border-t-0 sm:pt-0 sm:text-right shrink-0">
                    <div className="text-[11px] text-zinc-400">
                      Total gasto ({store.receipt_count === 1 ? '1 nota' : `${store.receipt_count} notas`})
                    </div>
                    <div className="text-sm font-semibold text-zinc-200">
                      {formatCurrency(store.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. SEÇÃO SECUNDÁRIA COMPACTA: RESUMO DE GASTOS PESSOAIS & CATEGORIAS */}
      <div className="pt-2">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Resumo de Gastos Pessoais (Secundário)
            </h2>
            <p className="text-[11px] text-zinc-500">
              Visão geral das suas notas fiscais desde {formatMonthYear(summary.month_start)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-zinc-400" />
              Total: <strong className="text-zinc-200">{formatCurrency(totalMonth)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-zinc-400" />
              <strong className="text-zinc-200">{summary.receipt_count}</strong> notas
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Evolução Mensal Compacta */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Evolução Mensal de Gastos</CardTitle>
              <CardDescription className="text-xs">
                Total gasto por mês nos últimos 6 meses
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={summary.monthly_spending}
                    margin={{ top: 6, right: 8, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="#a1a1aa"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      fontFamily="Inter, sans-serif"
                    />
                    <YAxis
                      stroke="#a1a1aa"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      fontFamily="Inter, sans-serif"
                      tickFormatter={(value: number) => `R$${value}`}
                    />
                    <Tooltip content={<CustomChartTooltip metricLabel="Total" />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#spendingGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gastos por Categoria Compacto */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Divisão por Categoria</CardTitle>
              <CardDescription className="text-xs">
                Proporção secundária por tipo de produto
              </CardDescription>
            </CardHeader>

            <CardContent>
              {summary.by_category.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-400">
                  Nenhuma categoria registrada neste período.
                </p>
              ) : (
                <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
                  <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary.by_category}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={60}
                          paddingAngle={3}
                        >
                          {summary.by_category.map((cat, idx) => (
                            <Cell
                              key={cat.category_id ?? 'uncategorized'}
                              fill={DONUT_PALETTE[idx % DONUT_PALETTE.length]}
                              stroke="#121215"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomChartTooltip metricLabel="Gasto" />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {summary.by_category.map((cat, idx) => {
                      const pct =
                        totalMonth > 0 ? Math.round((cat.total / totalMonth) * 100) : 0;
                      const swatchColor = DONUT_PALETTE[idx % DONUT_PALETTE.length];
                      return (
                        <div
                          key={cat.category_id ?? 'uncategorized'}
                          className="flex items-center justify-between rounded-md border border-[#27272a]/60 bg-[#09090b]/50 px-2.5 py-1.5 text-[11px]"
                        >
                          <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: swatchColor }}
                            />
                            <span>{cat.icon}</span>
                            <span className="truncate">{cat.name}</span>
                          </span>
                          <span className="font-semibold text-zinc-200">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
