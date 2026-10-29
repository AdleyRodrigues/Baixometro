import { lazy, Suspense, useEffect, useState } from 'react';
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
  Loader2,
  PlusCircle,
  ReceiptText,
  Settings,
  TrendingDown,
  UserPlus,
} from 'lucide-react';
import type { HealthResponse } from '@baixometro/shared-types';
import { api } from './api';
import AuthModal from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'));
const ReceiptDetailPage = lazy(() => import('./pages/ReceiptDetailPage'));
const NewReceiptPage = lazy(() => import('./pages/NewReceiptPage'));
const ProductHistoryPage = lazy(() => import('./pages/ProductHistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SettingsCategoriesPage = lazy(() => import('./pages/SettingsCategoriesPage'));
const SettingsProductsPage = lazy(() => import('./pages/SettingsProductsPage'));
const SettingsSupportPage = lazy(() => import('./pages/SettingsSupportPage'));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#10b981]" />
    </div>
  );
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/receipts', label: 'Histórico', icon: ReceiptText, end: true },
  { to: '/receipts/new', label: 'Nova Nota', icon: PlusCircle, end: false },
  { to: '/settings', label: 'Ajustes', icon: Settings, end: false },
];

function BottomNav() {
  const { pathname } = useLocation();

  if (pathname === '/login') {
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
  const { isAuthenticated, openAuthModal } = useAuth();

  useEffect(() => {
    api
      .getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const isOnline = health?.status === 'ok';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pt-4 pb-28 gap-5">
      <AuthModal />

      <header className="sticky top-3 z-20 flex items-center justify-between rounded-xl border border-[#27272a] bg-[#121215]/90 px-4 py-3 backdrop-blur-md shadow-sm">
        <Link to="/" className="flex items-center gap-2.5">
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

          {!isAuthenticated && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => openAuthModal({ defaultTab: 'register' })}
              className="h-8 px-2.5 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5 text-[#10b981]" />
              <span className="hidden sm:inline">Entrar</span>
            </Button>
          )}

          <Link
            to="/settings"
            aria-label="Configurações"
            title="Configurações de Categorias e Produtos"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272a] bg-[#09090b] text-zinc-400 transition-colors hover:border-[#10b981]/40 hover:text-[#10b981]"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/receipts/new" element={<NewReceiptPage />} />
            <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
            <Route path="/products/:id" element={<ProductHistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/categories" element={<SettingsCategoriesPage />} />
            <Route path="/settings/products" element={<SettingsProductsPage />} />
            <Route path="/settings/support" element={<SettingsSupportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
