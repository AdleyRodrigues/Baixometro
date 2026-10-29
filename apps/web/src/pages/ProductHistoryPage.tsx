import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Package,
  Store,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProductPriceHistory } from '@baixometro/shared-types';
import { api } from '../api';
import { Badge } from '../components/ui/badge';
import { Button, buttonVariants } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { formatCurrency, formatDate } from '../format';
import { cn } from '../lib/utils';

const STORE_COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'];

interface ChartRow {
  dateLabel: string;
  observed_at: string;
  [storeName: string]: string | number | undefined;
}

export default function ProductHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProductPriceHistory | null>(null);
  // Começa sempre pelo Preço Unitário por padrão (mais fácil de entender)
  const [metric, setMetric] = useState<'unit' | 'kg_l'>('unit');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .getProductHistory(id)
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Falha ao carregar histórico do produto');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-label="Carregando histórico de preços">
        <Skeleton className="h-[64px] w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
        </div>
        <Skeleton className="h-[290px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-5 space-y-4">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
          {error ?? 'Produto não encontrado'}
        </div>
        <Link to="/" className={cn(buttonVariants({ variant: 'secondary' }))}>
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao Dashboard</span>
        </Link>
      </Card>
    );
  }

  const { product, observations } = data;
  const stores = Array.from(new Set(observations.map((o) => o.store_name)));

  const getMetricPrice = (obs: (typeof observations)[number]) =>
    metric === 'unit' ? obs.unit_price : (obs.unit_price_per_kg_l ?? obs.unit_price);

  const chartData: ChartRow[] = observations.map((obs) => ({
    dateLabel: formatDate(obs.observed_at),
    observed_at: obs.observed_at,
    [obs.store_name]: getMetricPrice(obs),
  }));

  const prices = observations.map(getMetricPrice);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const lastPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const prevPrice = prices.length > 1 ? prices[prices.length - 2] : lastPrice;

  const minObs =
    observations.length > 0
      ? observations.reduce((best, cur) =>
          getMetricPrice(cur) < getMetricPrice(best) ? cur : best,
        )
      : null;
  const lastObs = observations.length > 0 ? observations[observations.length - 1] : null;

  const diffPct =
    prices.length > 1 && prevPrice > 0
      ? Math.round(((lastPrice - prevPrice) / prevPrice) * 1000) / 10
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10b981] hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao Radar de Preços</span>
          </Link>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#10b981]" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">{product.name}</h1>
          </div>
          <p className="text-xs text-zinc-400">
            {product.gtin ? `GTIN/EAN: ${product.gtin}` : 'Produto sem código de barras (GTIN)'}
          </p>
        </div>

        {/* Seletor de métrica: Preço Unitário SEMPRE em primeiro lugar */}
        <div className="inline-flex items-center rounded-xl border border-[#27272a] bg-[#121215] p-1">
          <Button
            type="button"
            size="sm"
            variant={metric === 'unit' ? 'default' : 'ghost'}
            className="h-8 px-3 text-xs"
            onClick={() => setMetric('unit')}
          >
            Preço Unitário
          </Button>
          <Button
            type="button"
            size="sm"
            variant={metric === 'kg_l' ? 'default' : 'ghost'}
            className="h-8 px-3 text-xs"
            onClick={() => setMetric('kg_l')}
          >
            R$/kg ou L
          </Button>
        </div>
      </div>

      {/* KPIs de Preço do Produto */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4 border-[#10b981]/30 bg-gradient-to-br from-[#10b981]/10 via-[#121215] to-[#121215]">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span className="uppercase tracking-wider">
              Menor Preço ({metric === 'unit' ? 'Unit.' : 'kg/L'})
            </span>
            <Award className="h-4 w-4 text-[#10b981]" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#10b981]">
            {formatCurrency(minPrice)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {minObs ? `Onde: ${minObs.store_name}` : 'Sem registros ainda'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span className="uppercase tracking-wider">
              Último Preço ({metric === 'unit' ? 'Unit.' : 'kg/L'})
            </span>
            <Store className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-50">
            {formatCurrency(lastPrice)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {lastObs
              ? `${lastObs.store_name} • Máx: ${formatCurrency(maxPrice)}`
              : 'Sem compras registradas'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span className="uppercase tracking-wider">Tendência de Preço</span>
            {diffPct < 0 ? (
              <TrendingDown className="h-4 w-4 text-[#10b981]" />
            ) : diffPct > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
            )}
          </div>
          <div
            className={cn(
              'mt-2 text-2xl font-bold tracking-tight',
              diffPct < 0
                ? 'text-[#10b981]'
                : diffPct > 0
                  ? 'text-red-400'
                  : 'text-zinc-100',
            )}
          >
            {prices.length <= 1
              ? 'Preço Base'
              : diffPct < 0
                ? `Baixou ${Math.abs(diffPct)}%`
                : diffPct > 0
                  ? `Subiu +${diffPct}%`
                  : 'Estável (0%)'}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {prices.length <= 1
              ? `${observations.length} compra registrada`
              : `Anterior: ${formatCurrency(prevPrice)} → Atual: ${formatCurrency(lastPrice)}`}
          </div>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle>
              Evolução de Preço ({metric === 'unit' ? 'Preço Unitário' : 'R$/kg ou L'})
            </CardTitle>
            <CardDescription>
              Comparativo por supermercado ao longo das compras
            </CardDescription>
          </div>
          <Badge variant="default">
            {metric === 'unit' ? 'Visão Unitária' : 'Por Quilo/Litro'}
          </Badge>
        </CardHeader>

        <CardContent>
          {observations.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhuma observação de preço registrada para este produto.
            </div>
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="Inter, sans-serif"
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="Inter, sans-serif"
                    tickFormatter={(value: number) => `R$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121215',
                      border: '1px solid #27272a',
                      borderRadius: '0.75rem',
                      color: '#fafafa',
                      fontSize: '0.75rem',
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      metric === 'unit' ? 'Preço Unitário' : 'Preço/kg·L',
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  {stores.map((storeName, idx) => (
                    <Line
                      key={storeName}
                      type="monotone"
                      dataKey={storeName}
                      name={storeName}
                      stroke={STORE_COLORS[idx % STORE_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: STORE_COLORS[idx % STORE_COLORS.length] }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registros de Compra */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Preços nos Mercados ({observations.length})</CardTitle>
          <CardDescription>
            Valores unitários pagos em cada compra registrada
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-2">
            {observations
              .slice()
              .reverse()
              .map((obs) => {
                const isLowest = obs.unit_price === Math.min(...observations.map((o) => o.unit_price));
                return (
                  <div
                    key={obs.observation_id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3.5 py-2.5',
                      isLowest
                        ? 'border-[#10b981]/35 bg-[#10b981]/5'
                        : 'border-[#27272a]/80 bg-[#09090b]/60',
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                        <Store className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{obs.store_name}</span>
                        {isLowest && observations.length > 1 && (
                          <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                            Menor Preço
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400">{formatDate(obs.observed_at)}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-[#10b981]">
                        {formatCurrency(obs.unit_price)} <span className="text-xs font-normal text-zinc-400">un.</span>
                      </div>
                      {obs.unit_price_per_kg_l != null && (
                        <div className="text-[11px] text-zinc-400">
                          {formatCurrency(obs.unit_price_per_kg_l)} / kg ou L
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
