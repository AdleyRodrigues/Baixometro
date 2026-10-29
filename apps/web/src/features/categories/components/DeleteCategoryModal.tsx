import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import type { Category } from '@baixometro/shared-types';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

type DeleteCategoryModalProps = {
  category: Category | null,
  onClose: () => void,
  deleting: boolean,
  error?: string | null,
  onConfirm: () => void,
};

export function DeleteCategoryModal({
  category,
  onClose,
  deleting,
  error,
  onConfirm,
}: DeleteCategoryModalProps) {
  return (
    <Dialog
      open={Boolean(category)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Excluir Categoria</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a categoria{' '}
            <strong className="text-zinc-200">
              {category?.icon} {category?.name}
            </strong>
            ? Os itens das notas fiscais vinculados ficarão como "Sem categoria".
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

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
                <span>Confirmar Exclusão</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

