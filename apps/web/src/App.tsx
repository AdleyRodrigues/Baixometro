import { useEffect, useState } from 'react';
import type { HealthResponse } from '@baixometro/shared-types';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/health`);
      if (!res.ok) {
        throw new Error(`Status HTTP: ${res.status}`);
      }
      const data = (await res.json()) as HealthResponse;
      setHealth(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar à API';
      setError(message);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const apiStatusText = loading
    ? 'carregando...'
    : health
      ? health.status
      : 'indisponível';

  const isOk = health?.status === 'ok';

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(12px)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          <span>Fase 0 — Fundação</span>
        </div>

        <h1
          style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            margin: 0,
            background: 'linear-gradient(to right, #38bdf8, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Baixômetro
        </h1>

        <p
          style={{
            color: '#94a3b8',
            fontSize: '0.9375rem',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Gerenciador pessoal de preços de supermercado, local-first e open-source.
        </p>

        <div
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '0.75rem',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isOk ? '#22c55e' : loading ? '#eab308' : '#ef4444',
                boxShadow: isOk
                  ? '0 0 10px #22c55e'
                  : loading
                    ? '0 0 10px #eab308'
                    : '0 0 10px #ef4444',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>
              API: {apiStatusText}
            </span>
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
          >
            {loading ? 'Checando...' : 'Atualizar'}
          </button>
        </div>

        {error && (
          <div
            style={{
              color: '#f87171',
              fontSize: '0.8125rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              width: '100%',
            }}
          >
            Erro ao conectar com a API: {error}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            width: '100%',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          <div
            style={{
              padding: '0.5rem',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '0.5rem',
            }}
          >
            📱 Mobile-first
          </div>
          <div
            style={{
              padding: '0.5rem',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '0.5rem',
            }}
          >
            ⚡ Local-first
          </div>
          <div
            style={{
              padding: '0.5rem',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '0.5rem',
            }}
          >
            📦 PWA Ready
          </div>
        </div>
      </div>
    </main>
  );
}
