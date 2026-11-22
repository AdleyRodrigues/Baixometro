import { useState } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

export const CONSENT_STORAGE_KEY = 'baixometro_consent_v1';

export function hasUserConsented(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
}

interface ConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentModal({ open, onAccept, onDecline }: ConsentModalProps) {
  const [dontAskAgain, setDontAskAgain] = useState(true);

  const handleAccept = () => {
    if (dontAskAgain && typeof window !== 'undefined') {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    }
    onAccept();
  };

  const handleDecline = () => {
    if (dontAskAgain && typeof window !== 'undefined') {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    }
    onDecline();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleDecline()}>
      <DialogContent className="max-w-md border-emerald-500/25 bg-[#121215]">
        <DialogHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-base font-semibold text-zinc-100">
            Compartilhar Preços com a Comunidade?
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-300">
            Para ajudar a comunidade, podemos usar os dados anônimos de localização e preços das
            suas notas para alimentar o Baixômetro. Nenhum dado pessoal (como seu nome ou CPF) será
            compartilhado. Você aceita?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-xl border border-[#27272a] bg-[#09090b] p-3 text-xs text-zinc-400">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>
              <strong className="text-zinc-200">100% Anônimo:</strong> Seus dados pessoais nunca são
              armazenados publicamente.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>
              <strong className="text-zinc-200">Radar de Economia:</strong> Ajuda a apontar onde os
              produtos estão mais baratos na sua cidade.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>
              <strong className="text-zinc-200">Colaborativo:</strong> Como no Waze, quanto mais
              pessoas colaboram, mais todos economizam.
            </span>
          </div>
        </div>

        <label
          htmlFor="dont-ask-again-consent"
          className="flex cursor-pointer items-center gap-2 select-none text-xs text-zinc-400 hover:text-zinc-300"
        >
          <input
            id="dont-ask-again-consent"
            type="checkbox"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/30"
          />
          <span>Não perguntar novamente</span>
        </label>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full justify-center gap-2 bg-[#10b981] font-semibold text-zinc-950 hover:bg-[#10b981]/90"
            onClick={handleAccept}
          >
            <Check className="h-4 w-4" />
            <span>Sim, quero colaborar</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center gap-1.5 text-zinc-400 hover:text-zinc-200"
            onClick={handleDecline}
          >
            <X className="h-3.5 w-3.5" />
            <span>Continuar sem compartilhar</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

