import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProductPriceHistory } from '@baixometro/shared-types';
import { api } from '../api';
import { formatCurrency, formatDate } from '../format';

const STORE_COLORS = ['#38bdf8', '#a855f7', '#22c55e', '#f97316', '#ec4899', '#facc15'];

interface ChartRow {
  dateLabel: string;
  observed_at: string;
  [storeName: string]: string | number | undefined;
}

export default function ProductHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProductPriceHistory | null>(null);
  const [metric, setMetric] = useState<'kg_l' | 'unit'>('kg_l');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .getProductHistory(id)
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Falha ao carregar histórico do produto');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="card loading-state">⏳ Carregando histórico de preços...</div>;
  }

  if (error || !data) {
    return (
      <div className="card">
        <div className="alert-error">{error ?? 'Produto não encontrado'}</div>
        <Link to="/" className="btn btn-secondary">
          ← Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  const { product, observations } = data;
  const stores = Array.from(new Set(observations.map((o) => o.store_name)));

  const chartData: ChartRow[] = observations.map((obs) => {
    const val =
      metric === 'kg_l'
        ? (obs.unit_price_per_kg_l ?? obs.unit_price)
        : obs.unit_price;
    return {
      dateLabel: formatDate(obs.observed_at),
      observed_at: obs.observed_at,
      [obs.store_name]: val,
    };
  });

  const prices = observations.map((o) =>
    metric === 'kg_l' ? (o.unit_price_per_kg_l ?? o.unit_price) : o.unit_price,
  );
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const lastPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="section-header">
        <div>
          <Link
            to="/"
            style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'inline-block', marginBottom: '0.2rem' }}
          >
            ← Voltar ao Dashboard
          </Link>
          <h1 className="section-title" style={{ fontSize: '1.25rem' }}>
            📦 {product.name}
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {product.gtin ? `GTIN/EAN: ${product.gtin}` : 'Produto sem GTIN cadastrado'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            type="button"
            className={`btn ${metric === 'kg_l' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem' }}
            onClick={() => setMetric('kg_l')}
          >
            R$/kg ou L
          </button>
          <button
            type="button"
            className={`btn ${metric === 'unit' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem' }}
            onClick={() => setMetric('unit')}
          >
            Preço Unit.
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Menor Preço</span>
          <span className="kpi-value" style={{ color: '#22c55e', fontSize: '1.25rem' }}>
            {formatCurrency(minPrice)}
          </span>
          <span className="kpi-sub">Melhor oferta histórica</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Último Preço</span>
          <span className="kpi-value" style={{ color: '#38bdf8', fontSize: '1.25rem' }}>
            {formatCurrency(lastPrice)}
          </span>
          <span className="kpi-sub">Máx: {formatCurrency(maxPrice)}</span>
        </div>
      </div>

      <section className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              Evolução de Preço ({metric === 'kg_l' ? 'R$/kg ou L' : 'Unitário'})
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Comparativo por mercado ao longo do tempo
            </p>
          </div>
        </div>

        {observations.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma observação de preço registrada para este produto.</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis
                  dataKey="dateLabel"
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
                  formatter={(value: number) => [formatCurrency(value), 'Preço']}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                {stores.map((storeName, idx) => (
                  <Line
                    key={storeName}
                    type="monotone"
                    dataKey={storeName}
                    name={storeName}
                    stroke={STORE_COLORS[idx % STORE_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Registros de Compra ({observations.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {observations
            .slice()
            .reverse()
            .map((obs) => (
              <div
                key={obs.observation_id}
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
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    🏪 {obs.store_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {formatDate(obs.observed_at)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#38bdf8' }}>
                    {formatCurrency(obs.unit_price)} un.
                  </div>
                  {obs.unit_price_per_kg_l != null && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {formatCurrency(obs.unit_price_per_kg_l)} / kg·L
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

