import { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Flame,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import type { PublicCityInsights } from '@baixometro/shared-types';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';
import { formatCurrency, formatDate } from '../../../format';

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const POPULAR_CITIES = [
  { city: 'São Paulo', state: 'SP' },
  { city: 'Fortaleza', state: 'CE' },
  { city: 'Rio de Janeiro', state: 'RJ' },
  { city: 'Belo Horizonte', state: 'MG' },
  { city: 'Curitiba', state: 'PR' },
];

interface CityRadarSectionProps {
  city: string;
  state: string;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  insights: PublicCityInsights | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

export function CityRadarSection({
  city,
  state,
  onCityChange,
  onStateChange,
  insights,
  loading,
  error,
  onReload,
}: CityRadarSectionProps) {
  const [localCityInput, setLocalCityInput] = useState(city);

  const handleCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localCityInput.trim()) {
      onCityChange(localCityInput.trim());
    }
  };

  const handleSelectQuickCity = (quickCity: string, quickState: string) => {
    setLocalCityInput(quickCity);
    onCityChange(quickCity);
    onStateChange(quickState);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Seletor de Cidade / Estado */}
      <Card className="border-[#27272a] bg-[#121215] p-4">
        <form onSubmit={handleCitySubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <Input
                type="text"
                value={localCityInput}
                onChange={(e) => setLocalCityInput(e.target.value)}
                onBlur={() => {
                  if (localCityInput.trim() && localCityInput !== city) {
                    onCityChange(localCityInput.trim());
                  }
                }}
                placeholder="Digite sua cidade (ex: São Paulo)"
                className="h-11 min-h-[44px] pl-10 rounded-lg bg-[#09090b] text-zinc-100 placeholder:text-zinc-500 border-[#27272a]"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                aria-label="Estado (UF)"
                value={state}
                onChange={(e) => onStateChange(e.target.value)}
                className="h-11 min-h-[44px] rounded-lg border border-[#27272a] bg-[#09090b] px-3 text-sm font-medium text-zinc-200 outline-none focus:border-emerald-500 cursor-pointer text-center"
              >
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>

              <Button
                type="submit"
                variant="default"
                className="h-11 min-h-[44px] px-5 text-xs font-bold gap-2 shrink-0 rounded-lg bg-[#10b981] text-zinc-950 hover:bg-[#10b981]/90"
                disabled={loading}
              >
                <Search className="h-4 w-4 stroke-[2.5]" />
                <span>Atualizar Radar</span>
              </Button>
            </div>
          </div>

          {/* Quick city suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-zinc-400">
            <span className="text-zinc-500">Cidades frequentes:</span>
            {POPULAR_CITIES.map((item) => {
              const isSelected =
                city.toLowerCase() === item.city.toLowerCase() && state === item.state;
              return (
                <button
                  key={`${item.city}-${item.state}`}
                  type="button"
                  onClick={() => handleSelectQuickCity(item.city, item.state)}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                      : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {item.city}, {item.state}
                </button>
              );
            })}
          </div>
        </form>
      </Card>

      {/* Loading state */}
      {loading && !insights && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[360px] w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-red-500/30 bg-red-950/20 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm text-red-300">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="secondary" onClick={onReload} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Tentar novamente</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Main Grid: Top 10 Produtos em Alta & Top 5 Mercados Mais Baratos */}
      {insights && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Card 1: Top 10 Produtos em Alta */}
          <Card className="border-red-500/20 bg-[#121215] flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-[#27272a]/60 min-h-[76px] flex flex-col justify-center">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="whitespace-nowrap text-sm sm:text-base font-semibold text-zinc-100">
                      Top 10 Produtos em Alta
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400 truncate">
                      Maiores aumentos de preço em {city}, {state}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-red-500/30 text-red-400 whitespace-nowrap shrink-0 px-2.5 py-1 text-xs font-semibold"
                >
                  {insights.top_price_spikes.length}{' '}
                  {insights.top_price_spikes.length === 1 ? 'alta' : 'altas'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col justify-start">
              {insights.top_price_spikes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 flex-1 text-center text-zinc-400">
                  <TrendingUp className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-sm font-medium text-zinc-300">Nenhum aumento expressivo detectado</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    Não há registros de aumentos repentinos de preço nesta cidade nos últimos 30 dias.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/70">
                  {insights.top_price_spikes.map((product, idx) => (
                    <div
                      key={`${product.product_id}-${idx}`}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="truncate text-sm font-semibold text-zinc-200">
                          {product.product_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                          <span className="flex items-center gap-1 text-zinc-300">
                            <Building2 className="h-3 w-3 text-zinc-500" />
                            {product.store_name}
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            {formatDate(product.observed_at)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-sm font-bold text-zinc-100">
                            {formatCurrency(product.current_price)}
                          </span>
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-red-500/15 px-1.5 py-0.5 text-xs font-bold text-red-400">
                            <TrendingUp className="h-3 w-3" />
                            +{product.percentage_increase.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          era {formatCurrency(product.average_30d_price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Top 5 Mercados Mais Baratos */}
          <Card className="border-emerald-500/20 bg-[#121215] flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-[#27272a]/60 min-h-[76px] flex flex-col justify-center">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="whitespace-nowrap text-sm sm:text-base font-semibold text-zinc-100">
                      Top 5 Mercados Mais Baratos
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400 truncate">
                      Menor preço médio registrado em {city}, {state}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-400 whitespace-nowrap shrink-0 px-2.5 py-1 text-xs font-semibold"
                >
                  {insights.cheapest_stores.length}{' '}
                  {insights.cheapest_stores.length === 1 ? 'loja' : 'lojas'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col justify-start">
              {insights.cheapest_stores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 flex-1 text-center text-zinc-400">
                  <Building2 className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-sm font-medium text-zinc-300">Ainda sem dados suficientes</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    Seja o primeiro a doar notas de supermercados em {city} para desbloquear o ranking!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/70">
                  {insights.cheapest_stores.map((store, index) => {
                    const isFirst = index === 0;
                    return (
                      <div
                        key={store.store_id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isFirst
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-200">
                              {store.store_name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {store.observation_count}{' '}
                              {store.observation_count === 1 ? 'preço registrado' : 'preços registrados'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-400">
                            {formatCurrency(store.average_price)}
                          </span>
                          <p className="text-[10px] text-zinc-500 mt-0.5">preço médio</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Banner Informativo LGPD / Crowdsourcing */}
      <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#09090b] p-4 text-xs text-zinc-400">
        <Sparkles className="h-5 w-5 shrink-0 text-emerald-400" />
        <p>
          <strong className="text-zinc-200">Radar 100% Crowdsourcing:</strong> Os dados acima são
          alimentados diretamente pelas notas fiscais compartilhadas de forma anônima pelos próprios
          consumidores. Nenhum dado pessoal é salvo ou exposto.
        </p>
      </div>
    </div>
  );
}

