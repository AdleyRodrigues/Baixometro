import { Compass, Sparkles, UserPlus, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

interface AnonymousSaveSuccessModalProps {
  open: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onViewRadar: () => void;
}

export function AnonymousSaveSuccessModal({
  open,
  onClose,
  onOpenAuth,
  onViewRadar,
}: AnonymousSaveSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md border-emerald-500/30 bg-[#121215]">
        <DialogHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-zinc-100">
            Nota enviada com sucesso!
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-300">
            Obrigado por ajudar a comunidade! Os preços desta nota já estão no radar público da sua
            região e ajudando outros consumidores a economizarem.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-3.5 text-xs text-emerald-200">
          <p className="font-semibold text-zinc-100">
            💡 Quer salvar esta e outras notas no seu histórico pessoal?
          </p>
          <p className="mt-1 text-zinc-400">
            Crie uma conta gratuita em poucos segundos para desbloquear gráficos de gastos mensais,
            alertas de inflação e seu termômetro personalizado de preços.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full justify-center gap-2 bg-[#10b981] font-semibold text-zinc-950 hover:bg-[#10b981]/90"
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
          >
            <UserPlus className="h-4 w-4" />
            <span>Criar Conta Grátis</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full justify-center gap-2"
            onClick={() => {
              onClose();
              onViewRadar();
            }}
          >
            <Compass className="h-4 w-4 text-emerald-400" />
            <span>Ir para o Radar de Preços</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center gap-1.5 text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
            <span>Continuar sem login</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

