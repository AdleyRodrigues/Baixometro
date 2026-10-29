import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  Package,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { formatCurrency } from '../../../format';
import { cn } from '../../../lib/utils';
import type { ProductPriceInsight } from '../types';

type ProductThermometerSectionProps = {
  productInsights: ProductPriceInsight[],
  productFilter: 'all' | 'dropped' | 'increased',
  setProductFilter: (f: 'all' | 'dropped' | 'increased') => void,
  droppedOrLowestCount: number,
  increasedCount: number,
};

export function ProductThermometerSection({
  productInsights,
  productFilter,
  setProductFilter,
  droppedOrLowestCount,
  increasedCount,
}: ProductThermometerSectionProps) {
  const filteredProducts = productInsights.filter((item) => {
    if (productFilter === 'dropped') return item.status === 'dropped' || item.status === 'lowest';
    if (productFilter === 'increased') return item.status === 'increased';
    return true;
  });

  return (
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
  );
}

