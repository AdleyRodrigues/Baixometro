import { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import type { HealthResponse } from '@baixometro/shared-types';
import { api } from './api';
import DashboardPage from './pages/DashboardPage';
import ReceiptsPage from './pages/ReceiptsPage';
import NewReceiptPage from './pages/NewReceiptPage';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api
      .getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const isOnline = health?.status === 'ok';

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <span className="brand-title">Baixômetro</span>
            <span className="brand-badge">MVP</span>
          </div>

          <div className="status-pill" title="Status da API">
            <span
              className="status-dot"
              style={{
                backgroundColor: isOnline ? '#22c55e' : '#ef4444',
                boxShadow: isOnline ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
              }}
            />
            <span>{isOnline ? 'API online' : 'API offline'}</span>
          </div>
        </header>

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/receipts/new" element={<NewReceiptPage />} />
          </Routes>
        </main>

        <nav className="bottom-nav" aria-label="Navegação principal">
          <div className="bottom-nav-inner">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span>📊</span>
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/receipts"
              end
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span>🧾</span>
              <span>Histórico</span>
            </NavLink>

            <NavLink
              to="/receipts/new"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span>➕</span>
              <span>Nova Nota</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </BrowserRouter>
  );
}
