import { ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle, FileUp, ImageUp, QrCode, X, Zap } from 'lucide-react';
import { Button, buttonVariants } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (accessKey: string, qrUrl?: string) => void;
  onRequestXmlUpload?: () => void;
}

const DEMO_NFCE_URL =
  'http://nfce.sefaz.ce.gov.br/pages/ShowNFCe.html?p=23261007123456000188650010000456781000456789|2|1|1|A1B2C3';

/**
 * Extrai a chave de acesso de 44 dígitos de um QR Code de NFC-e
 * (geralmente no formato `...?p=44_DIGITOS|2|1|...`) ou texto bruto.
 */
export function extractAccessKey(raw: string): string | null {
  const paramMatch = raw.match(/[?&]p=([0-9]{44})/i);
  if (paramMatch?.[1]) {
    return paramMatch[1];
  }

  const anyMatch = raw.match(/\b([0-9]{44})\b/) ?? raw.match(/([0-9]{44})/);
  return anyMatch?.[1] ?? null;
}

export default function QrScannerModal({
  open,
  onClose,
  onDetected,
  onRequestXmlUpload,
}: QrScannerModalProps) {
  const reactId = useId().replace(/:/g, '');
  const readerElementId = `qr-reader-${reactId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState('');
  const [scanningFile, setScanningFile] = useState(false);

  useEffect(() => {
    if (!open) return;

    handledRef.current = false;
    setCameraError(null);

    const html5QrCode = new Html5Qrcode(readerElementId);
    scannerRef.current = html5QrCode;

    let cancelled = false;

    html5QrCode
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        (decodedText) => {
          if (handledRef.current || cancelled) return;
          const key = extractAccessKey(decodedText);
          if (!key) {
            setCameraError(
              'QR Code lido, mas não contém uma chave NFC-e válida de 44 dígitos.',
            );
            return;
          }
          handledRef.current = true;
          const qrUrl =
            decodedText.trim().startsWith('http://') ||
            decodedText.trim().startsWith('https://')
              ? decodedText.trim()
              : undefined;
          html5QrCode
            .stop()
            .catch(() => {})
            .finally(() => {
              onDetected(key, qrUrl);
            });
        },
        () => {
          // frame sem QR Code — ignorado
        },
      )
      .catch(() => {
        if (cancelled) return;
        setCameraError(
          'Nenhuma câmera encontrada neste dispositivo. Você pode enviar uma imagem do QR Code, colar a chave abaixo ou usar o botão de simulação.',
        );
      });

    return () => {
      cancelled = true;
      if (html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .catch(() => {})
          .finally(() => {
            html5QrCode.clear();
          });
      }
    };
  }, [open, readerElementId, onDetected]);

  if (!open) return null;

  const handleManualSubmit = () => {
    const trimmed = manualKey.trim();
    const key = extractAccessKey(trimmed);
    if (!key) {
      setCameraError('Informe uma URL de NFC-e ou chave válida com 44 dígitos numéricos.');
      return;
    }
    const qrUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : undefined;
    onDetected(key, qrUrl);
  };

  const handleSimulateScan = () => {
    const key = extractAccessKey(DEMO_NFCE_URL);
    if (key) {
      onDetected(key, DEMO_NFCE_URL);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    setScanningFile(true);
    setCameraError(null);
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      const decodedText = await scannerRef.current.scanFile(file, true);
      const key = extractAccessKey(decodedText);
      if (!key) {
        setCameraError(
          'QR Code lido da imagem, mas não contém uma chave NFC-e de 44 dígitos.',
        );
        return;
      }
      const qrUrl =
        decodedText.trim().startsWith('http://') ||
        decodedText.trim().startsWith('https://')
          ? decodedText.trim()
          : undefined;
      onDetected(key, qrUrl);
    } catch {
      setCameraError('Não foi possível encontrar um QR Code válido nesta imagem.');
    } finally {
      setScanningFile(false);
      e.target.value = '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escanear QR Code da NFC-e"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-[460px]"
      >
        <Card className="border-[#27272a] bg-[#121215] shadow-2xl">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-4 w-4 text-[#10b981]" />
                <span>Escanear QR Code NFC-e</span>
              </CardTitle>
              <CardDescription>
                Aponte a câmera para o cupom fiscal ou escolha uma alternativa abaixo
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={onClose}
              aria-label="Fechar scanner"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            <div
              id={readerElementId}
              className={cn(
                'w-full overflow-hidden rounded-xl border border-[#27272a] bg-[#09090b]',
                cameraError ? 'min-h-[60px]' : 'min-h-[240px]',
              )}
            />

            {cameraError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" onClick={handleSimulateScan}>
                <Zap className="h-4 w-4 text-[#10b981]" />
                <span>Simular QR Teste</span>
              </Button>

              <label
                htmlFor="qr-image-upload"
                className={cn(buttonVariants({ variant: 'secondary' }), 'cursor-pointer')}
              >
                <ImageUp className="h-4 w-4 text-zinc-300" />
                <span>{scanningFile ? 'Lendo imagem...' : 'Ler imagem de QR'}</span>
                <input
                  id="qr-image-upload"
                  name="qr-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleFileChange(e).catch(() => {});
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2 border-t border-[#27272a] pt-3">
              <label
                className="block text-xs font-medium text-zinc-400"
                htmlFor="manual-access-key"
              >
                Ou cole a URL da SEFAZ / chave de 44 dígitos:
              </label>
              <div className="flex gap-2">
                <Input
                  id="manual-access-key"
                  name="manual-access-key"
                  type="text"
                  placeholder="Ex.: http://nfce.sefaz.ce.gov.br/...?p=2326..."
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                />
                <Button type="button" onClick={handleManualSubmit} className="shrink-0">
                  Importar
                </Button>
              </div>

              {onRequestXmlUpload && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2 w-full"
                  onClick={() => {
                    onClose();
                    onRequestXmlUpload();
                  }}
                >
                  <FileUp className="h-4 w-4 text-[#10b981]" />
                  <span>SEFAZ instável ou Captcha? Importar XML da Nota</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
