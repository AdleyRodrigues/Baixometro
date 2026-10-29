import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileUp,
  KeyRound,
  Loader2,
  Package,
  Plus,
  QrCode,
  Sparkles,
  Store,
} from 'lucide-react';
import QrScannerModal from '../components/QrScannerModal';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { formatCurrency } from '../format';
import { DuplicateReceiptAlertModal } from '../features/receipts/components/DuplicateReceiptAlertModal';
import { ReceiptItemRow } from '../features/receipts/components/ReceiptItemRow';
import { SefazErrorModal } from '../features/receipts/components/SefazErrorModal';
import { useNewReceipt } from '../features/receipts/hooks/useNewReceipt';

export default function NewReceiptPage() {
  const {
    xmlInputRef,
    storeName,
    setStoreName,
    accessKey,
    issuedDate,
    setIssuedDate,
    items,
    categories,
    products,
    scannerOpen,
    setScannerOpen,
    importing,
    submitting,
    error,
    suggestXmlFallback,
    importedBanner,
    duplicateModalOpen,
    setDuplicateModalOpen,
    duplicateReceipt,
    sefazErrorModalOpen,
    setSefazErrorModalOpen,
    addItem,
    removeItem,
    updateItem,
    previewTotal,
    handleQrDetected,
    handleXmlFileChange,
    handleSampleXmlImport,
    handleFormSubmit,
  } = useNewReceipt();

  return (
    <>
      <DuplicateReceiptAlertModal
        open={duplicateModalOpen}
        duplicateReceipt={duplicateReceipt}
        onClose={() => setDuplicateModalOpen(false)}
      />

      <SefazErrorModal
        open={sefazErrorModalOpen}
        errorMessage={error}
        onClose={() => setSefazErrorModalOpen(false)}
        onImportXml={() => {
          xmlInputRef.current?.click();
        }}
        onRetryQr={() => {
          setScannerOpen(true);
        }}
      />

      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(key, qrUrl) => {
          handleQrDetected(key, qrUrl).catch(() => {});
        }}
        onRequestXmlUpload={() => {
          xmlInputRef.current?.click();
        }}
      />

      <input
        ref={xmlInputRef}
        id="nfce-xml-upload"
        name="nfce-xml-upload"
        type="file"
        accept=".xml,text/xml,application/xml"
        onChange={handleXmlFileChange}
        className="hidden"
      />

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onSubmit={handleFormSubmit}
        className="flex flex-col gap-4"
      >
        {/* Header & Botões de Importação */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">
              {accessKey ? 'Revisar Nota Importada' : 'Nova Nota Fiscal'}
            </h1>
            <p className="text-xs text-zinc-400">
              Escaneie o QR Code da NFC-e, importe o XML oficial ou preencha os itens abaixo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setScannerOpen(true)}
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#10b981]" />
              ) : (
                <QrCode className="h-4 w-4 text-[#10b981]" />
              )}
              <span>{importing ? 'Importando...' : 'Escanear QR Code'}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => xmlInputRef.current?.click()}
              disabled={importing}
            >
              <FileUp className="h-4 w-4 text-[#10b981]" />
              <span>Importar XML da Nota</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleSampleXmlImport}
              disabled={importing}
            >
              <Sparkles className="h-4 w-4 text-[#10b981]" />
              <span>Testar XML Exemplo</span>
            </Button>
          </div>
        </div>

        {/* Indicador de carregamento / consulta à SEFAZ */}
        {importing && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-3.5 text-xs text-emerald-200 animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin text-[#10b981] shrink-0" />
            <div>
              <p className="font-semibold text-zinc-100">Consultando nota fiscal na SEFAZ...</p>
              <p className="text-zinc-400">Aguardando resposta do portal oficial (timeout de segurança: 20s)</p>
            </div>
          </div>
        )}

        {/* Banner de Sucesso na Importação */}
        {importedBanner && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#10b981]/35 bg-[#10b981]/10 p-3.5 text-xs text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10b981]" />
            <span>{importedBanner}</span>
          </div>
        )}

        {/* Erro / Sugestão de Fallback XML */}
        {error && (
          <div className="space-y-3 rounded-xl border border-red-500/35 bg-red-950/20 p-4 text-xs text-red-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span className="font-medium">{error}</span>
            </div>

            {suggestXmlFallback && (
              <div className="space-y-2.5 border-t border-red-500/25 pt-3">
                <p className="text-zinc-300">
                  <strong>Dica:</strong> Se o portal da SEFAZ estiver fora do ar ou exigindo
                  Captcha, você pode enviar diretamente o arquivo <strong>.xml</strong> da NFC-e:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => xmlInputRef.current?.click()}
                    disabled={importing}
                  >
                    <FileUp className="h-4 w-4" />
                    <span>Enviar XML da Nota (.xml)</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSampleXmlImport}
                    disabled={importing}
                  >
                    <Sparkles className="h-4 w-4 text-[#10b981]" />
                    <span>Testar com XML de Exemplo (SEFAZ-CE)</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card 1: Dados do Mercado */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Store className="h-4 w-4 text-[#10b981]" />
              <span>Dados do Estabelecimento</span>
            </CardTitle>
            <CardDescription>
              Identifique o supermercado e a data da compra
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  className="block text-xs font-medium text-zinc-300"
                  htmlFor="store-name"
                >
                  Nome do Mercado *
                </label>
                <Input
                  id="store-name"
                  type="text"
                  placeholder="Ex.: Supermercado São Luiz"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                  htmlFor="issued-date"
                >
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Data da Compra *</span>
                </label>
                <Input
                  id="issued-date"
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {accessKey && (
              <div className="flex items-start gap-2 rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-2 text-xs text-zinc-400">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10b981]" />
                <div className="break-all">
                  <span>Chave NFC-e: </span>
                  <strong className="font-mono text-zinc-200">{accessKey}</strong>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Lista de Itens */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-[#10b981]" />
                <span>Itens da Compra ({items.length})</span>
              </CardTitle>
              <CardDescription>
                Informe o preço unitário pago em cada produto
              </CardDescription>
            </div>

            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 text-[#10b981]" />
              <span>Adicionar item</span>
            </Button>
          </CardHeader>

          <CardContent className="space-y-3.5">
            {items.map((item, idx) => (
              <ReceiptItemRow
                key={item.key}
                item={item}
                index={idx}
                totalItems={items.length}
                categories={categories}
                products={products}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </CardContent>
        </Card>

        {/* Card 3: Total & Salvar */}
        <Card className="border-[#10b981]/30 bg-gradient-to-br from-[#10b981]/5 via-[#121215] to-[#121215]">
          <CardContent className="flex flex-col items-stretch justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div>
              <span className="text-xs text-zinc-400">Valor Total Calculado</span>
              <div className="text-2xl font-bold tracking-tight text-[#10b981]">
                {formatCurrency(previewTotal)}
              </div>
              <span className="text-[11px] text-zinc-500">
                {items.length} {items.length === 1 ? 'item' : 'itens'} na nota
              </span>
            </div>

            <div className="flex gap-2.5">
              <Link
                to="/receipts"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#27272a] bg-[#18181b] px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </Link>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Nota Fiscal</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.form>
    </>
  );
}
