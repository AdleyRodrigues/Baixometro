import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardSummary } from '@baixometro/shared-types';
import { api } from '../api';
import { formatCurrency, formatMonthYear } from '../format';

const MOCK_MONTHLY_SPENDING = [
  { month: 'Mai', total: 820.4 },
  { month: 'Jun', total: 945.1 },
  { month: 'Jul', total: 780.9 },
  { month: 'Ago', total: 1020.5 },
  { month: 'Set', total: 890.0 },
  { month: 'Out', total: 965.3 },
];

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o resumo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="card">Carregando resumo do mês...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-error">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const totalMonth = summary.total_month;
  const maxCategory = Math.max(...summary.by_category.map((c) => c.total), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: '1.25rem' }}>
            Resumo Mensal
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
            {formatMonthYear(summary.month_start)}
          </p>
        </div>
        <Link to="/receipts/new" className="btn btn-primary">
          + Nova Nota
        </Link>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Gasto no mês</span>
          <span className="kpi-value" style={{ color: '#38bdf8' }}>
            {formatCurrency(totalMonth)}
          </span>
          <span className="kpi-sub">Total acumulado</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Notas registradas</span>
          <span className="kpi-value">{summary.receipt_count}</span>
          <span className="kpi-sub">
            {summary.receipt_count === 1
              ? '1 compra no mês'
              : `${summary.receipt_count} compras no mês`}
          </span>
        </div>
      </div>

      {/* Evolução de Gastos (Recharts - últimos 6 meses mockados) */}
      <section className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Evolução de Gastos</h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Últimos 6 meses (dados demonstrativos)
            </p>
          </div>
          <span className="brand-badge">Recharts</span>
        </div>

        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={MOCK_MONTHLY_SPENDING}
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

      {/* Gráfico de barras horizontais por categoria */}
      <section className="card">
        <div className="section-header">
          <h2 className="section-title">Gastos por Categoria</h2>
        </div>

        {summary.by_category.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma compra registrada neste mês.</p>
            <Link to="/receipts/new" className="btn btn-secondary">
              Registrar primeira nota
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {summary.by_category.map((cat) => {
              const pctOfMonth = totalMonth > 0 ? Math.round((cat.total / totalMonth) * 100) : 0;
              const barWidth = Math.max(Math.round((cat.total / maxCategory) * 100), 4);
              return (
                <div
                  key={cat.category_id ?? 'uncategorized'}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      {formatCurrency(cat.total)}{' '}
                      <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.75rem' }}>
                        ({pctOfMonth}%)
                      </span>
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '9999px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        borderRadius: '9999px',
                        backgroundColor: cat.color || '#38bdf8',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Gastos agrupados por mercado */}
      <section className="card">
        <div className="section-header">
          <h2 className="section-title">Gastos por Mercado</h2>
          <Link to="/receipts" style={{ fontSize: '0.8125rem', color: '#38bdf8' }}>
            Ver histórico →
          </Link>
        </div>

        {summary.by_store.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Nenhum mercado movimentado neste mês.
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
    </div>
  );
}
