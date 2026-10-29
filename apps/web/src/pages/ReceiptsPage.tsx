import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReceiptSummary } from '@baixometro/shared-types';
import { api } from '../api';
import { formatCurrency, formatDate } from '../format';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReceipts();
      setReceipts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar notas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: '1.25rem' }}>
            Histórico de Notas
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
            Todas as compras registradas
          </p>
        </div>
        <Link to="/receipts/new" className="btn btn-primary">
          + Nova Nota
        </Link>
      </div>

      {loading && <div className="card">Carregando histórico...</div>}

      {error && (
        <div className="card">
          <div className="alert-error">{error}</div>
          <button type="button" className="btn btn-secondary" onClick={load}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && receipts.length === 0 && (
        <div className="card empty-state">
          <p>Você ainda não cadastrou nenhuma nota fiscal.</p>
          <Link to="/receipts/new" className="btn btn-primary">
            Cadastrar primeira nota
          </Link>
        </div>
      )}

      {!loading && !error && receipts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {receipts.map((r) => (
            <article
              key={r.id}
              className="card"
              style={{
                padding: '1rem',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                  🏪 {r.store_name}
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                  {formatDate(r.issued_at)} •{' '}
                  {r.item_count === 1 ? '1 item' : `${r.item_count} itens`}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '1.125rem', color: '#38bdf8' }}>
                  {formatCurrency(r.total_amount)}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

