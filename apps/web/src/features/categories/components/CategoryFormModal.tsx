import { FormEvent } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
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
import { Input } from '../../../components/ui/input';

const PRESET_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

const PRESET_ICONS = ['🛒', '🥫', '🥦', '🥩', '🧀', '🥖', '🧴', '🧼', '🍺', '🐾'];

type CategoryFormModalProps = {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  editingCategory: Category | null,
  name: string,
  setName: (name: string) => void,
  color: string,
  setColor: (color: string) => void,
  icon: string,
  setIcon: (icon: string) => void,
  saving: boolean,
  modalError: string | null,
  onSubmit: (e: FormEvent) => void,
};

export function CategoryFormModal({
  open,
  onOpenChange,
  editingCategory,
  name,
  setName,
  color,
  setColor,
  icon,
  setIcon,
  saving,
  modalError,
  onSubmit,
}: CategoryFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogDescription>
            Escolha o nome, o ícone e a cor de identificação para os itens das notas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {modalError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="cat-name" className="block text-xs font-medium text-zinc-300">
              Nome da Categoria *
            </label>
            <Input
              id="cat-name"
              type="text"
              placeholder="Ex.: Laticínios, Padaria, Limpeza..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cat-icon" className="block text-xs font-medium text-zinc-300">
              Ícone (Emoji)
            </label>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {PRESET_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors ${
                    icon === emoji
                      ? 'border-[#10b981] bg-[#10b981]/15'
                      : 'border-[#27272a] bg-[#09090b] hover:bg-zinc-800'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Input
              id="cat-icon"
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cat-color" className="block text-xs font-medium text-zinc-300">
              Cor de Destaque
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-label={`Cor ${hex}`}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    color.toLowerCase() === hex.toLowerCase()
                      ? 'scale-110 border-white'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
              <input
                id="cat-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-[#27272a] bg-[#09090b] p-0.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
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
                  <span>{editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

