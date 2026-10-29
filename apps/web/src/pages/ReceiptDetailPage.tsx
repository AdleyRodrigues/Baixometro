import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Category, ReceiptDetail } from '@baixometro/shared-types';
import { api } from '../api';
import { formatCurrency, formatDate } from '../format';

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ReceiptDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getReceipt(id),
      api.getCategories().catch(() => [] as Category[]),
    ])
      .then(([receiptData, cats]) => {
        setDetail(receiptData);
        setCategories(cats);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Falha ao carregar detalhes da nota');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="card loading-state">⏳ Carregando detalhes da nota fiscal...</div>;
  }

  if (error || !detail) {
    return (
      <div className="card">
        <div className="alert-error">{error ?? 'Nota fiscal não encontrada'}</div>
        <Link to="/receipts" className="btn btn-secondary">
          ← Voltar ao Histórico
        </Link>
      </div>
    );
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="section-header">
        <div>
          <Link
            to="/receipts"
            style={{
              fontSize: '0.75rem',
              color: '#38bdf8',
              display: 'inline-block',
              marginBottom: '0.2rem',
            }}
          >
            ← Voltar ao Histórico
          </Link>
          <h1 className="section-title" style={{ fontSize: '1.25rem' }}>
            🏪 {detail.store.name}
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
            Emitida em {formatDate(detail.issued_at)}
            {detail.store.cnpj ? ` • CNPJ: ${detail.store.cnpj}` : ''}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className="kpi-label">Total da Nota</span>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>
            {formatCurrency(detail.total_amount)}
          </div>
        </div>
      </div>

      {detail.access_key && (
        <div
          className="card"
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.75rem',
            color: '#94a3b8',
            wordBreak: 'break-all',
          }}
        >
          🔑 Chave de Acesso NFC-e: <strong style={{ color: '#e2e8f0' }}>{detail.access_key}</strong>
        </div>
      )}

      <section className="card">
        <div className="section-header">
          <h2 className="section-title">Itens da Nota ({detail.items.length})</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {detail.items.map((item, idx) => {
            const cat = item.category_id ? categoryMap.get(item.category_id) : undefined;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f8fafc' }}>
                    {idx + 1}. {item.description}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
                    {item.gtin ? ` • GTIN: ${item.gtin}` : ''}
                  </div>
                  {cat && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.7rem',
                        color: cat.color || '#38bdf8',
                        marginTop: '0.15rem',
                      }}
                    >
                      {cat.icon} {cat.name}
                    </span>
                  )}
                </div>

                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#e2e8f0' }}>
                    {formatCurrency(item.total_price)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

