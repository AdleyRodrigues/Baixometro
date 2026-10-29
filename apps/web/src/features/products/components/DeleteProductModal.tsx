import { Loader2, Trash2 } from 'lucide-react';
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

type DeleteProductModalProps = {
  product: Product | null,
  onClose: () => void,
  deleting: boolean,
  onConfirm: () => void,
};

export function DeleteProductModal({
  product,
  onClose,
  deleting,
  onConfirm,
}: DeleteProductModalProps) {
  return (
    <Dialog
      open={Boolean(product)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Excluir Produto</DialogTitle>
          <DialogDescription>
            Deseja remover o produto{' '}
            <strong className="text-zinc-200">{product?.name}</strong>? Ele não
            possui observações de preço registradas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Excluir Produto</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

