import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Calendar,
  Package,
  Plus,
  ReceiptText,
  Search,
  Store,
  X,
} from 'lucide-react';
import type { ReceiptSummary } from '@baixometro/shared-types';
import { api } from '../api';
import { Badge } from '../components/ui/badge';
import { Button, buttonVariants } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { formatCurrency, formatDate } from '../format';
import { cn } from '../lib/utils';

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">
              Histórico de Notas
            </h1>
            {!loading && (
              <Badge variant="secondary">
                {receipts.length} {receipts.length === 1 ? 'nota' : 'notas'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            Toque em uma nota fiscal para inspecionar os itens e preços unitários
          </p>
        </div>

        <Link to="/receipts/new" className={cn(buttonVariants({ variant: 'default' }))}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Nova Nota</span>
        </Link>
      </div>

      {/* Barra de busca com shadcn Input */}
      <Card className="p-3.5">
        <label
          htmlFor="receipt-search"
          className="mb-1.5 block text-xs font-medium text-zinc-400"
        >
          Buscar por supermercado ou data da compra
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            id="receipt-search"
            name="receipt-search"
            type="search"
            placeholder="Ex.: Atacadão, São Luiz, 28 de out., 2026-10..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </Card>

      {/* Skeletons de carregamento */}
      {loading && (
        <div className="flex flex-col gap-2.5" aria-label="Carregando histórico de notas">
          {[1, 2, 3, 4].map((idx) => (
            <Skeleton key={idx} className="h-[78px] w-full" />
          ))}
        </div>
      )}

      {/* Erro */}
      {error && (
        <Card className="p-5 space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
            {error}
          </div>
          <Button variant="secondary" onClick={load}>
            Tentar novamente
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && receipts.length === 0 && (
        <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <ReceiptText className="h-8 w-8 text-zinc-500" />
          <p className="text-sm text-zinc-400">
            Você ainda não cadastrou nenhuma nota fiscal.
          </p>
          <Link to="/receipts/new" className={cn(buttonVariants({ variant: 'default' }))}>
            <Plus className="h-4 w-4" />
            <span>Cadastrar primeira nota</span>
          </Link>
        </Card>
      )}

      {/* Filtro vazio */}
      {!loading && !error && receipts.length > 0 && filteredReceipts.length === 0 && (
        <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-zinc-400">
            Nenhuma nota encontrada para <strong className="text-zinc-200">"{searchQuery}"</strong>.
          </p>
          <Button variant="secondary" onClick={() => setSearchQuery('')}>
            Limpar filtro
          </Button>
        </Card>
      )}

      {/* Lista de Cards Elegantes */}
      {!loading && !error && filteredReceipts.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {filteredReceipts.map((r) => (
            <Link key={r.id} to={`/receipts/${r.id}`} className="group block">
              <Card className="transition-all duration-150 group-hover:border-[#10b981]/45 group-hover:bg-[#18181b]/90">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#27272a] bg-[#09090b] text-[#10b981]">
                        <Store className="h-4 w-4" />
                      </div>
                      <span className="truncate text-sm font-semibold text-zinc-100 group-hover:text-white">
                        {r.store_name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pl-10 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                        {formatDate(r.issued_at)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-zinc-500" />
                        {r.item_count === 1 ? '1 item' : `${r.item_count} itens`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-base font-bold text-[#10b981]">
                        {formatCurrency(r.total_amount)}
                      </div>
                      <div className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200">
                        Ver itens
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-[#10b981]" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
