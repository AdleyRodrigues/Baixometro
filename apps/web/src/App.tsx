import { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, ReceiptText, TrendingDown } from 'lucide-react';
import type { HealthResponse } from '@baixometro/shared-types';
import { api } from './api';
import { Badge } from './components/ui/badge';
import { cn } from './lib/utils';
import DashboardPage from './pages/DashboardPage';
import ReceiptsPage from './pages/ReceiptsPage';
import ReceiptDetailPage from './pages/ReceiptDetailPage';
import NewReceiptPage from './pages/NewReceiptPage';
import ProductHistoryPage from './pages/ProductHistoryPage';

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
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pt-4 pb-24 gap-5">
        <header className="sticky top-3 z-20 flex items-center justify-between rounded-xl border border-[#27272a] bg-[#121215]/90 px-4 py-3 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981]">
              <TrendingDown className="h-4 w-4 stroke-[2.25]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-zinc-50">
                Baixômetro
              </span>
              <Badge variant="default" className="px-2 py-0 text-[10px] uppercase tracking-wider">
                MVP
              </Badge>
            </div>
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-full border border-[#27272a] bg-[#09090b] px-3 py-1 text-xs font-medium text-zinc-300"
            title="Status da API"
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isOnline
                  ? 'bg-[#10b981] shadow-[0_0_8px_#10b981]'
                  : 'bg-red-500 shadow-[0_0_8px_#ef4444]',
              )}
            />
            <span>{isOnline ? 'API online' : 'API offline'}</span>
          </div>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/receipts/new" element={<NewReceiptPage />} />
            <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
            <Route path="/products/:id" element={<ProductHistoryPage />} />
          </Routes>
        </main>

        <nav
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#27272a] bg-[#09090b]/95 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
          aria-label="Navegação principal"
        >
          <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-[#10b981]/12 text-[#10b981]'
                    : 'text-zinc-400 hover:bg-[#18181b] hover:text-zinc-100',
                )
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/receipts"
              end
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-[#10b981]/12 text-[#10b981]'
                    : 'text-zinc-400 hover:bg-[#18181b] hover:text-zinc-100',
                )
              }
            >
              <ReceiptText className="h-4 w-4" />
              <span>Histórico</span>
            </NavLink>

            <NavLink
              to="/receipts/new"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-[#10b981]/12 text-[#10b981]'
                    : 'text-zinc-400 hover:bg-[#18181b] hover:text-zinc-100',
                )
              }
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nova Nota</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </BrowserRouter>
  );
}
