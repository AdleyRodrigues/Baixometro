import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Check } from 'lucide-react';
import type { ReceiptDetail } from '@baixometro/shared-types';
import { Button, buttonVariants } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { formatCurrency, formatDate } from '../../../format';
import { cn } from '../../../lib/utils';

interface DuplicateReceiptAlertModalProps {
  open: boolean;
  duplicateReceipt: ReceiptDetail | null;
  onClose: () => void;
}

export function DuplicateReceiptAlertModal({
  open,
  duplicateReceipt,
  onClose,
}: DuplicateReceiptAlertModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base text-zinc-100">
            Nota Já Registrada Anteriormente
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Esta nota fiscal (mesma chave de 44 dígitos) já está cadastrada no seu histórico de compras.
          </DialogDescription>
        </DialogHeader>

        {duplicateReceipt && (
          <div className="space-y-2 rounded-xl border border-[#27272a] bg-[#09090b] p-3 text-xs text-zinc-300">
            <div className="flex justify-between">
              <span className="text-zinc-400">Mercado:</span>
              <strong className="text-zinc-100">{duplicateReceipt.store.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Data de Emissão:</span>
              <span className="text-zinc-200">
                {formatDate(duplicateReceipt.issued_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Valor Total:</span>
              <strong className="text-[#10b981]">
                {formatCurrency(duplicateReceipt.total_amount)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total de Itens:</span>
              <span className="text-zinc-200">{duplicateReceipt.items.length} itens</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={onClose}>
            <Check className="h-4 w-4" />
            <span>Entendi</span>
          </Button>

          {duplicateReceipt && (
            <Link
              to={`/receipts/${duplicateReceipt.id}`}
              className={cn(buttonVariants({ variant: 'default' }))}
            >
              <span>Ver Nota Existente</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
