import { FileUp, RefreshCw, ServerCrash, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

interface SefazErrorModalProps {
  open: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onImportXml: () => void;
  onRetryQr?: () => void;
}

export function SefazErrorModal({
  open,
  errorMessage,
  onClose,
  onImportXml,
  onRetryQr,
}: SefazErrorModalProps) {
  const displayMessage =
    errorMessage ||
    'Não foi possível ler o QR Code (SEFAZ instável). Você pode tentar novamente ou importar o XML da nota.';

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md border-amber-500/25 bg-[#121215]">
        <DialogHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
            <ServerCrash className="h-6 w-6" />
          </div>
          <DialogTitle className="text-base font-semibold text-zinc-100">
            SEFAZ Temporariamente Instável
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-300">
            {displayMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-[#27272a] bg-[#09090b] p-3 text-xs text-zinc-400">
          <p>
            💡 <strong className="text-zinc-200">Dica:</strong> Erros 500 e instabilidades na
            SEFAZ ocorrem com frequência. Ao baixar o arquivo <strong>.xml</strong> da nota, o Baixômetro lê todos os produtos, quantidades e valores de forma instantânea e sem depender da internet da SEFAZ.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full justify-center gap-2 bg-[#10b981] text-zinc-950 hover:bg-[#10b981]/90"
            onClick={() => {
              onClose();
              onImportXml();
            }}
          >
            <FileUp className="h-4 w-4" />
            <span>Importar XML da Nota</span>
          </Button>

          <div className="flex w-full gap-2">
            {onRetryQr && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1 justify-center gap-1.5"
                onClick={() => {
                  onClose();
                  onRetryQr();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tentar QR Novamente</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              className="flex-1 justify-center text-zinc-400 hover:text-zinc-200"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
              <span>Digitar Manualmente</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

