import { ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (accessKey: string) => void;
}

const DEMO_NFCE_URL =
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35261012345678000199650010000001231000001230|2|1|1|A1B2C3';

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

export default function QrScannerModal({ open, onClose, onDetected }: QrScannerModalProps) {
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
          html5QrCode
            .stop()
            .catch(() => {})
            .finally(() => {
              onDetected(key);
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
    const key = extractAccessKey(manualKey);
    if (!key) {
      setCameraError('Informe uma URL de NFC-e ou chave válida com 44 dígitos numéricos.');
      return;
    }
    onDetected(key);
  };

  const handleSimulateScan = () => {
    const key = extractAccessKey(DEMO_NFCE_URL);
    if (key) {
      onDetected(key);
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
      onDetected(key);
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#1e293b',
          border: '1px solid rgba(56, 189, 248, 0.25)',
        }}
      >
        <div className="section-header">
          <h2 className="section-title">📷 Escanear QR Code NFC-e</h2>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>

        <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
          Aponte a câmera para o QR Code impresso no cupom fiscal ou escolha uma alternativa abaixo.
        </p>

        <div
          id={readerElementId}
          style={{
            width: '100%',
            minHeight: cameraError ? '60px' : '240px',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        />

        {cameraError && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '0.65rem',
              background: 'rgba(234, 179, 8, 0.14)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              color: '#fde047',
              fontSize: '0.8125rem',
            }}
          >
            {cameraError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={handleSimulateScan}
          >
            ⚡ Simular QR de Teste (1 clique)
          </button>

          <label
            htmlFor="qr-image-upload"
            className="btn btn-secondary"
            style={{ flex: 1, cursor: 'pointer' }}
          >
            🖼️ {scanningFile ? 'Lendo imagem...' : 'Ler imagem de QR'}
            <input
              id="qr-image-upload"
              name="qr-image-upload"
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleFileChange(e).catch(() => {});
              }}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <label className="field-label" htmlFor="manual-access-key">
            Ou cole a URL da SEFAZ / chave de 44 dígitos:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="manual-access-key"
              name="manual-access-key"
              className="input"
              type="text"
              placeholder="Ex.: https://.../?p=35261012345678..."
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={handleManualSubmit}>
              Importar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
