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
import { Receipt, Wallet } from 'lucide-react';
import type { DashboardSummary } from '@baixometro/shared-types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { formatCurrency, formatMonthYear } from '../../../format';
import { DONUT_PALETTE } from '../types';
import { CustomChartTooltip } from './CustomChartTooltip';

type SpendingChartsSectionProps = {
  summary: DashboardSummary,
};

export function SpendingChartsSection({ summary }: SpendingChartsSectionProps) {
  const totalMonth = summary.total_month;

  return (
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
  );
}

