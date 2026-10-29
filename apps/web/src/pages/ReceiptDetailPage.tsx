import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Calendar,
  KeyRound,
  Package,
  ReceiptText,
  Store,
} from 'lucide-react';
import type { Category, ReceiptDetail } from '@baixometro/shared-types';
import { api } from '../api';
import { Badge } from '../components/ui/badge';
import { buttonVariants } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { formatCurrency, formatDate } from '../format';
import { cn } from '../lib/utils';

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
    return (
      <div className="flex flex-col gap-4" aria-label="Carregando detalhes da nota fiscal">
        <Skeleton className="h-[130px] w-full" />
        <Skeleton className="h-[260px] w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <Card className="p-5 space-y-4">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
          {error ?? 'Nota fiscal não encontrada'}
        </div>
        <Link to="/receipts" className={cn(buttonVariants({ variant: 'secondary' }))}>
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao Histórico</span>
        </Link>
      </Card>
    );
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {/* Link de retorno */}
      <div>
        <Link
          to="/receipts"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10b981] hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar ao Histórico de Notas</span>
        </Link>
      </div>

      {/* Card 1: Dados do Mercado e Total da Nota */}
      <Card className="border-[#10b981]/30 bg-gradient-to-br from-[#10b981]/10 via-[#121215] to-[#121215]">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#10b981]/30 bg-[#10b981]/15 text-[#10b981]">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-zinc-50">
                  {detail.store.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    Emitida em {formatDate(detail.issued_at)}
                  </span>
                  {detail.store.cnpj && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                      CNPJ: {detail.store.cnpj}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {detail.access_key && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#27272a] bg-[#09090b]/80 px-3 py-2 text-xs text-zinc-400">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10b981]" />
                <div className="break-all">
                  <span className="text-zinc-400">Chave de Acesso NFC-e: </span>
                  <strong className="font-mono text-zinc-200">{detail.access_key}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-row items-center justify-between border-t border-[#27272a] pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              <ReceiptText className="h-3.5 w-3.5 text-[#10b981]" />
              <span>Total da Nota</span>
            </span>
            <div className="mt-0.5 text-2xl font-bold tracking-tight text-[#10b981]">
              {formatCurrency(detail.total_amount)}
            </div>
            <span className="hidden text-[11px] text-zinc-400 sm:inline">
              {detail.items.length === 1 ? '1 item registrado' : `${detail.items.length} itens registrados`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Lista / Tabela de Itens da Nota */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[#10b981]" />
              <span>Itens da Nota Fiscal ({detail.items.length})</span>
            </CardTitle>
            <CardDescription>
              Preços unitários e subtotais registrados nesta compra
            </CardDescription>
          </div>
          <Badge variant="default">
            {detail.items.length} {detail.items.length === 1 ? 'item' : 'itens'}
          </Badge>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-2.5">
            {detail.items.map((item, idx) => {
              const cat = item.category_id ? categoryMap.get(item.category_id) : undefined;
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2.5 rounded-xl border border-[#27272a]/90 bg-[#09090b]/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#27272a] bg-[#18181b] text-[11px] font-bold text-zinc-300">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-zinc-100">
                        {item.description}
                      </span>
                      {cat && (
                        <Badge variant="secondary" className="gap-1">
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-7 text-xs text-zinc-400">
                      <span>
                        Preço unitário:{' '}
                        <strong className="text-[#10b981]">
                          {formatCurrency(item.unit_price)}
                        </strong>{' '}
                        /{item.unit}
                      </span>
                      <span>• Qtd: {item.quantity} {item.unit}</span>
                      {item.gtin && <span className="font-mono text-[11px]">• GTIN: {item.gtin}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#27272a]/60 pl-7 pt-2 sm:border-t-0 sm:pl-0 sm:pt-0 sm:block sm:text-right shrink-0">
                    <div className="text-[11px] text-zinc-400">Subtotal do item</div>
                    <div className="text-base font-bold text-zinc-100">
                      {formatCurrency(item.total_price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
