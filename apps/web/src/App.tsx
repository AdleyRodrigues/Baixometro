import { useEffect, useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  PlusCircle,
  ReceiptText,
  Settings,
  TrendingDown,
} from 'lucide-react';
import type { HealthResponse } from '@baixometro/shared-types';
import { api } from './api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Badge } from './components/ui/badge';
import { cn } from './lib/utils';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ReceiptsPage from './pages/ReceiptsPage';
import ReceiptDetailPage from './pages/ReceiptDetailPage';
import NewReceiptPage from './pages/NewReceiptPage';
import ProductHistoryPage from './pages/ProductHistoryPage';
import SettingsPage from './pages/SettingsPage';
import SettingsCategoriesPage from './pages/SettingsCategoriesPage';
import SettingsProductsPage from './pages/SettingsProductsPage';
import SettingsSupportPage from './pages/SettingsSupportPage';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/receipts', label: 'Histórico', icon: ReceiptText, end: true },
  { to: '/receipts/new', label: 'Nova Nota', icon: PlusCircle, end: false },
  { to: '/settings', label: 'Ajustes', icon: Settings, end: false },
];

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function BottomNav() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated || pathname === '/login') {
    return null;
  }

  const isTabActive = (to: string, end: boolean) => {
    if (end) {
      if (to === '/' && pathname.startsWith('/products/')) return true;
      if (
        to === '/receipts' &&
        pathname.startsWith('/receipts/') &&
        pathname !== '/receipts/new'
      ) {
        return true;
      }
      return pathname === to;
    }
    return pathname.startsWith(to);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#27272a] bg-[#09090b]/95 px-4 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-2 pb-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.to, item.end);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                'relative flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors',
                active
                  ? 'text-[#10b981]'
                  : 'text-zinc-400 hover:bg-[#18181b]/70 hover:text-zinc-100',
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-0 rounded-xl border border-[#10b981]/30 bg-[#10b981]/12"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function AppShell() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    api
      .getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const isOnline = health?.status === 'ok';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pt-4 pb-28 gap-5">
      <header className="sticky top-3 z-20 flex items-center justify-between rounded-xl border border-[#27272a] bg-[#121215]/90 px-4 py-3 backdrop-blur-md shadow-sm">
        <Link to={isAuthenticated ? '/' : '/login'} className="flex items-center gap-2.5">
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
        </Link>

        <div className="flex items-center gap-2">
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

          {isAuthenticated && (
            <Link
              to="/settings"
              aria-label="Configurações"
              title="Configurações de Categorias e Produtos"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272a] bg-[#09090b] text-zinc-400 transition-colors hover:border-[#10b981]/40 hover:text-[#10b981]"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receipts"
            element={
              <ProtectedRoute>
                <ReceiptsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receipts/new"
            element={
              <ProtectedRoute>
                <NewReceiptPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receipts/:id"
            element={
              <ProtectedRoute>
                <ReceiptDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoute>
                <ProductHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/categories"
            element={
              <ProtectedRoute>
                <SettingsCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/products"
            element={
              <ProtectedRoute>
                <SettingsProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/support"
            element={
              <ProtectedRoute>
                <SettingsSupportPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
