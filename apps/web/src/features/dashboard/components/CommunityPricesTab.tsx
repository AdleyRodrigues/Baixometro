import { Link } from 'react-router-dom';
import { Globe, Search, Store } from 'lucide-react';
import type { PublicPriceSearchItem } from '@baixometro/shared-types';
import { Badge } from '../../../components/ui/badge';
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

type CommunityPricesTabProps = {
  query: string,
  setQuery: (q: string) => void,
  prices: PublicPriceSearchItem[],
  loading: boolean,
};

export function CommunityPricesTab({
  query,
  setQuery,
  prices,
  loading,
}: CommunityPricesTabProps) {
  return (
    <Card className="border-[#10b981]/35 bg-[#121215]/95">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-[#10b981]" />
              <span>Buscar Preços na Comunidade (Crowdsourcing)</span>
            </CardTitle>
            <CardDescription>
              Menores preços unitários compartilhados anonimamente por usuários do Baixômetro
            </CardDescription>
          </div>
          <Badge variant="default">Acesso Público</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            id="public-price-search"
            name="public-price-search"
            aria-label="Buscar preços na comunidade"
            type="search"
            placeholder="Digite o produto, marca ou mercado (ex.: Café, Arroz, Queijo, São Luiz...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : prices.length === 0 ? (
          <div className="rounded-xl border border-[#27272a] bg-[#09090b]/60 p-6 text-center text-xs text-zinc-400">
            Nenhum preço público encontrado{query ? ` para "${query}"` : ''}. Ative o compartilhamento anônimo em{' '}
            <Link to="/settings" className="font-medium text-[#10b981] underline">
              Ajustes
            </Link>{' '}
            para colaborar com a comunidade!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {prices.map((item, idx) => (
              <div
                key={`${item.product_id}-${item.store_name}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#27272a] bg-[#09090b]/80 px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-zinc-100">
                      {item.product_name}
                    </span>
                    {idx === 0 && (
                      <Badge variant="default" className="text-[10px]">
                        Menor Preço
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1 text-zinc-300">
                      <Store className="h-3.5 w-3.5 text-[#10b981]" />
                      {item.store_name}
                    </span>
                    <span>•</span>
                    <span>Observado em {formatDate(item.observed_at)}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-base font-bold text-[#10b981]">
                    {formatCurrency(item.unit_price)}{' '}
                    <span className="text-[11px] font-normal text-zinc-400">un.</span>
                  </div>
                  {item.unit_price_per_kg_l !== null && (
                    <div className="text-[11px] text-zinc-400">
                      {formatCurrency(item.unit_price_per_kg_l)} / kg·L
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

