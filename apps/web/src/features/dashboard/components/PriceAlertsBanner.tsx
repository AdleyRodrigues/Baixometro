import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import type { PriceAlert } from '@baixometro/shared-types';
import { Badge } from '../../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';

type PriceAlertsBannerProps = {
  alerts: PriceAlert[],
};

export function PriceAlertsBanner({ alerts }: PriceAlertsBannerProps) {
  if (alerts.length === 0) return null;

  return (
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
  );
}

