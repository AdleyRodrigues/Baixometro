import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReceiptSummary } from '@baixometro/shared-types';
import { api } from '../api';
import { formatCurrency, formatDate } from '../format';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
    load().catch(() => {});
  }, []);

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return receipts;
    return receipts.filter((r) => {
      const formattedDate = formatDate(r.issued_at).toLowerCase();
      const isoDate = r.issued_at.slice(0, 10);
      return (
        r.store_name.toLowerCase().includes(q) ||
        formattedDate.includes(q) ||
        isoDate.includes(q)
      );
    });
  }, [receipts, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: '1.25rem' }}>
            Histórico de Notas
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
            Toque em uma nota para ver os itens detalhados
          </p>
        </div>
        <Link to="/receipts/new" className="btn btn-primary">
          + Nova Nota
        </Link>
      </div>

      {/* Barra de busca por mercado ou data */}
      <div className="card" style={{ padding: '0.75rem 1rem' }}>
        <label htmlFor="receipt-search" className="field-label">
          🔍 Buscar por mercado ou data
        </label>
        <input
          id="receipt-search"
          name="receipt-search"
          className="input"
          type="search"
          placeholder="Ex.: Atacadão, Teste, 28 de out., 2026-10..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading && <div className="card loading-state">⏳ Carregando histórico de notas...</div>}

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

      {!loading && !error && receipts.length > 0 && filteredReceipts.length === 0 && (
        <div className="card empty-state">
          <p>Nenhuma nota encontrada para "{searchQuery}".</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSearchQuery('')}
          >
            Limpar filtro
          </button>
        </div>
      )}

      {!loading && !error && filteredReceipts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredReceipts.map((r) => (
            <Link
              key={r.id}
              to={`/receipts/${r.id}`}
              className="card"
              style={{
                padding: '1rem',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s ease',
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
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ver detalhes →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
