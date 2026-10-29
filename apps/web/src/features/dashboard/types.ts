import type { DashboardSummary, Product } from '@baixometro/shared-types';
import type { DashboardPeriod } from '../../api';

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  month: 'Mês Atual',
  '3m': 'Últimos 3 meses',
  year: 'Ano',
};

export const DONUT_PALETTE = ['#10b981', '#34d399', '#059669', '#3b82f6', '#6366f1'];

export type ProductPriceInsight = {
  product: Product,
  observationCount: number,
  latestUnitPrice: number,
  latestStoreName: string,
  previousUnitPrice: number,
  minUnitPrice: number,
  minStoreName: string,
  variationPct: number,
  status: 'dropped' | 'increased' | 'lowest',
};

export function createEmptyDashboardSummary(period: DashboardPeriod): DashboardSummary {
  return {
    period,
    month_start: new Date().toISOString(),
    total_month: 0,
    receipt_count: 0,
    savings_amount: 0,
    by_category: [],
    by_store: [],
    monthly_spending: [],
  };
}
