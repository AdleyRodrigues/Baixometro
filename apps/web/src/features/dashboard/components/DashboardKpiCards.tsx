import { Package, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';

type DashboardKpiCardsProps = {
  droppedOrLowestCount: number,
  increasedCount: number,
  totalProducts: number,
};

export function DashboardKpiCards({
  droppedOrLowestCount,
  increasedCount,
  totalProducts,
}: DashboardKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* 1. Em queda / menor preço */}
      <Card className="border-[#10b981]/30 bg-gradient-to-br from-[#10b981]/15 via-[#121215] to-[#121215]">
        <CardContent className="space-y-1.5 p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <span>Em Queda / Menor Preço</span>
            <TrendingDown className="h-4 w-4" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-[#10b981]">
            {droppedOrLowestCount}{' '}
            <span className="text-base font-normal text-zinc-400">
              {droppedOrLowestCount === 1 ? 'produto' : 'produtos'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Com preço baixo ou estável no período
          </p>
        </CardContent>
      </Card>

      {/* 2. Subiram de preço */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#121215] to-[#121215]">
        <CardContent className="space-y-1.5 p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-400">
            <span>Subiram de Preço</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-amber-300">
            {increasedCount}{' '}
            <span className="text-base font-normal text-zinc-400">
              {increasedCount === 1 ? 'produto' : 'produtos'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Acima da média das compras anteriores
          </p>
        </CardContent>
      </Card>

      {/* 3. Total de Produtos Monitorados */}
      <Card className="border-[#27272a] bg-[#121215]">
        <CardContent className="space-y-1.5 p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <span>Produtos Monitorados</span>
            <Package className="h-4 w-4 text-[#10b981]" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-zinc-100">
            {totalProducts}{' '}
            <span className="text-base font-normal text-zinc-400">
              {totalProducts === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">Comparados por preço unitário</p>
        </CardContent>
      </Card>
    </div>
  );
}
