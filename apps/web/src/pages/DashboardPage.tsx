import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import type { DashboardSummary, PriceAlert, Product } from '@baixometro/shared-types';
import { api, type DashboardPeriod } from '../api';
import { formatCurrency, formatMonthYear } from '../format';

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  month: 'Mês Atual',
  '3m': 'Últimos 3 meses',
  year: 'Ano',
};

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
      setSummary(summaryData);
      setAlerts(alertsData);
      setProducts(prodList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o resumo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period).catch(() => {});
  }, [period, load]);

  if (loading && !summary) {
    return <div className="card loading-state">⏳ Carregando métricas do Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-error">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={() => load(period)}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const totalMonth = summary.total_month;
  const savings = summary.savings_amount;
  const isSavingPositive = savings >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="section-title" style={{ fontSize: '1.25rem' }}>
            Resumo Financeiro
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
            {PERIOD_LABELS[period]} • Desde {formatMonthYear(summary.month_start)}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="period-select" className="field-label" style={{ display: 'none' }}>
            Período
          </label>
          <select
            id="period-select"
            name="period-select"
            className="select"
            style={{ width: 'auto', padding: '0.45rem 0.7rem', fontSize: '0.8125rem' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
          >
            <option value="month">Mês Atual</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="year">Ano</option>
          </select>

          <Link to="/receipts/new" className="btn btn-primary">
            + Nova Nota
          </Link>
        </div>
      </div>

      {loading && (
        <div className="loading-state" style={{ padding: '0.4rem' }}>
          ⏳ Atualizando período...
        </div>
      )}

      {/* Alertas de Alta de Preço (> 10% acima da média de 30 dias) */}
      <section
        className="card"
        style={{
          border:
            alerts.length > 0
              ? '1px solid rgba(249, 115, 22, 0.45)'
              : '1px solid rgba(255, 255, 255, 0.08)',
          background:
            alerts.length > 0
              ? 'linear-gradient(145deg, rgba(67, 20, 7, 0.55), rgba(30, 41, 59, 0.85))'
              : undefined,
        }}
      >
        <div className="section-header">
          <div>
            <h2 className="section-title" style={{ color: alerts.length > 0 ? '#fdba74' : undefined }}>
              🚨 Alertas de Alta de Preço
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Produtos que subiram mais de 10% em relação à média dos últimos 30 dias
            </p>
          </div>
          <span
            className="brand-badge"
            style={{
              backgroundColor:
                alerts.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.16)',
              color: alerts.length > 0 ? '#f87171' : '#4ade80',
            }}
          >
            {alerts.length === 0 ? 'Estável' : `${alerts.length} em alta`}
          </span>
        </div>

        {alerts.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Nenhum produto monitorado teve aumento acima de 10% nos últimos 30 dias.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {alerts.map((alert) => (
              <Link
                key={alert.product_id}
                to={`/products/${alert.product_id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fef2f2' }}>
                    {alert.product_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    🏪 {alert.store_name} • Média 30d: {formatCurrency(alert.previous_avg_price)} →{' '}
                    <strong>{formatCurrency(alert.current_price)}</strong>
                  </div>
                </div>

                <span
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(239, 68, 68, 0.22)',
                    color: '#fca5a5',
                    fontWeight: 800,
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{alert.variation_pct}%
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* KPIs Reais */}
      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))' }}
      >
        <div className="kpi-card">
          <span className="kpi-label">Total no período</span>
          <span className="kpi-value" style={{ color: '#38bdf8', fontSize: '1.35rem' }}>
            {formatCurrency(totalMonth)}
          </span>
          <span className="kpi-sub">{PERIOD_LABELS[period]}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Notas registradas</span>
          <span className="kpi-value" style={{ fontSize: '1.35rem' }}>
            {summary.receipt_count}
          </span>
          <span className="kpi-sub">
            {summary.receipt_count === 1
              ? '1 compra no período'
              : `${summary.receipt_count} compras no período`}
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">
            {isSavingPositive ? 'Economia vs Média 30d' : 'Variação vs Média 30d'}
          </span>
          <span
            className="kpi-value"
            style={{
              color: savings === 0 ? '#e2e8f0' : isSavingPositive ? '#22c55e' : '#f97316',
              fontSize: '1.35rem',
            }}
          >
            {savings > 0 ? `+${formatCurrency(savings)}` : formatCurrency(savings)}
          </span>
          <span className="kpi-sub">
            {savings === 0
              ? 'Na média dos últimos 30 dias'
              : isSavingPositive
                ? 'Abaixo da média de 30d'
                : 'Acima da média de 30d'}
          </span>
        </div>
      </div>

      {/* Evolução Real de Gastos (Recharts - últimos 6 meses do banco) */}
      <section className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Evolução Mensal de Gastos</h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Últimos 6 meses calculados diretamente do banco
            </p>
          </div>
          <span className="brand-badge">Tempo Real</span>
        </div>

        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={summary.monthly_spending}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `R$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '0.625rem',
                  color: '#f8fafc',
                  fontSize: '0.8125rem',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Total']}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#spendingGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top 5 Categorias — Donut / PieChart Recharts */}
      <section className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Top 5 Categorias</h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Proporção de gastos no período selecionado
            </p>
          </div>
        </div>

        {summary.by_category.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma compra registrada neste período.</p>
            <Link to="/receipts/new" className="btn btn-secondary">
              Registrar nota
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.by_category}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {summary.by_category.map((cat) => (
                      <Cell
                        key={cat.category_id ?? 'uncategorized'}
                        fill={cat.color || '#38bdf8'}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '0.625rem',
                      color: '#f8fafc',
                      fontSize: '0.8125rem',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {summary.by_category.map((cat) => {
                const pct = totalMonth > 0 ? Math.round((cat.total / totalMonth) * 100) : 0;
                return (
                  <div
                    key={cat.category_id ?? 'uncategorized'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '0.6rem',
                      background: 'rgba(15, 23, 42, 0.5)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: cat.color || '#38bdf8',
                          display: 'inline-block',
                        }}
                      />
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      {formatCurrency(cat.total)}{' '}
                      <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.75rem' }}>
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Top 5 Mercados */}
      <section className="card">
        <div className="section-header">
          <h2 className="section-title">Top 5 Mercados</h2>
          <Link to="/receipts" style={{ fontSize: '0.8125rem', color: '#38bdf8' }}>
            Ver histórico →
          </Link>
        </div>

        {summary.by_store.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Nenhum mercado movimentado neste período.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {summary.by_store.map((store) => (
              <div
                key={store.store_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>🏪 {store.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {store.receipt_count === 1 ? '1 nota' : `${store.receipt_count} notas`}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#e2e8f0' }}>
                  {formatCurrency(store.total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Catálogo de Produtos Monitorados */}
      <section className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Produtos Monitorados</h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Toque em um produto para ver a evolução de preço (R$/kg ou L)
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Nenhum produto catalogado ainda.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {products.map((prod) => (
              <Link
                key={prod.id}
                to={`/products/${prod.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>📦 {prod.name}</div>
                  {prod.gtin && (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>GTIN: {prod.gtin}</div>
                  )}
                </div>
                <span style={{ fontSize: '0.8125rem', color: '#38bdf8', fontWeight: 600 }}>
                  Histórico →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
