import { FormEvent } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
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
import { Input } from '../../../components/ui/input';

type EditProductModalProps = {
  product: Product | null,
  onClose: () => void,
  name: string,
  setName: (name: string) => void,
  brand: string,
  setBrand: (brand: string) => void,
  gtin: string,
  setGtin: (gtin: string) => void,
  saving: boolean,
  error: string | null,
  onSubmit: (e: FormEvent) => void,
};

export function EditProductModal({
  product,
  onClose,
  name,
  setName,
  brand,
  setBrand,
  gtin,
  setGtin,
  saving,
  error,
  onSubmit,
}: EditProductModalProps) {
  return (
    <Dialog
      open={Boolean(product)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>
            Atualize o nome canônico, marca ou o código GTIN (código de barras)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="prod-name" className="block text-xs font-medium text-zinc-300">
              Nome do Produto *
            </label>
            <Input
              id="prod-name"
              type="text"
              placeholder="Ex.: Café Torrado e Moído 500g"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prod-brand" className="block text-xs font-medium text-zinc-300">
              Marca (opcional)
            </label>
            <Input
              id="prod-brand"
              type="text"
              placeholder="Ex.: Três Corações, Camil, Betânia..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prod-gtin" className="block text-xs font-medium text-zinc-300">
              Código de Barras GTIN / EAN (opcional)
            </label>
            <Input
              id="prod-gtin"
              type="text"
              placeholder="Ex.: 7891000100103"
              value={gtin}
              onChange={(e) => setGtin(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

