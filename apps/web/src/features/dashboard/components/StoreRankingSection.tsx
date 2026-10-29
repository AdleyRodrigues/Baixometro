import { Link } from 'react-router-dom';
import { ArrowUpRight, Award, Store } from 'lucide-react';
import type { StoreSpending } from '@baixometro/shared-types';
import { Badge } from '../../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { formatCurrency } from '../../../format';
import { cn } from '../../../lib/utils';

export type StoreRankingItem = StoreSpending & {
  cheapestCount: number,
  cheapestProducts: Array<{
    name: string,
    price: number,
  }>,
};

type StoreRankingSectionProps = {
  storePriceRanking: StoreRankingItem[],
};

export function StoreRankingSection({ storePriceRanking }: StoreRankingSectionProps) {
  return (
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
  );
}

