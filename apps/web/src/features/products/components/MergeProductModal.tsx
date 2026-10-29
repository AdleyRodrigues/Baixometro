import { FormEvent } from 'react';
import { AlertCircle, AlertTriangle, GitMerge, Loader2 } from 'lucide-react';
import type { Product } from '@baixometro/shared-types';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Select } from '../../../components/ui/select';

type MergeProductModalProps = {
  mergingSource: Product | null,
  onClose: () => void,
  targetProductId: string,
  setTargetProductId: (id: string) => void,
  products: Product[],
  selectedTargetProduct: Product | undefined,
  merging: boolean,
  error: string | null,
  onSubmit: (e: FormEvent) => void,
};

export function MergeProductModal({
  mergingSource,
  onClose,
  targetProductId,
  setTargetProductId,
  products,
  selectedTargetProduct,
  merging,
  error,
  onSubmit,
}: MergeProductModalProps) {
  return (
    <Dialog
      open={Boolean(mergingSource)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-[#10b981]" />
            <span>Mesclar Produtos Duplicados</span>
          </DialogTitle>
          <DialogDescription>
            Selecione o produto principal que receberá as compras e aliases
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-lg border border-[#27272a] bg-[#09090b] p-3 text-xs">
            <div className="text-zinc-400">Produto de origem (será mesclado e removido):</div>
            <div className="mt-1 font-semibold text-zinc-100">
              {mergingSource?.name}{' '}
              <span className="font-normal text-zinc-400">
                ({mergingSource?.observation_count ?? 0} observações)
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="merge-target-select"
              className="block text-xs font-medium text-zinc-300"
            >
              Mover todo o histórico para o produto (Destino) *
            </label>
            <Select
              id="merge-target-select"
              wrapperClassName="w-full"
              value={targetProductId}
              onChange={(e) => setTargetProductId(e.target.value)}
              required
            >
              {products
                .filter((p) => p.id !== mergingSource?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.observation_count} obs.)
                  </option>
                ))}
            </Select>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <strong>Atenção:</strong> Isso vai mover todo o histórico do produto{' '}
              <strong>"{mergingSource?.name}"</strong> para o produto{' '}
              <strong>"{selectedTargetProduct?.name ?? 'selecionado'}"</strong> e excluir o
              cadastro duplicado.
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={merging}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={merging || !targetProductId}>
              {merging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mesclando...</span>
                </>
              ) : (
                <>
                  <GitMerge className="h-4 w-4" />
                  <span>Confirmar Mesclagem</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

