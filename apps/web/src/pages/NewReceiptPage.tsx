import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  FileUp,
  KeyRound,
  Loader2,
  Package,
  Plus,
  QrCode,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react';
import type { Category, Product, ReceiptDetail } from '@baixometro/shared-types';
import { api, ApiError } from '../api';
import QrScannerModal from '../components/QrScannerModal';
import { Badge } from '../components/ui/badge';
import { Button, buttonVariants } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { formatCurrency, formatDate } from '../format';
import { cn } from '../lib/utils';

const SAMPLE_CEARA_NFCE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe23261007123456000188650010000456781000456789" versao="4.00">
      <ide>
        <cUF>23</cUF>
        <mod>65</mod>
        <dhEmi>2026-10-28T18:30:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>07123456000188</CNPJ>
        <xNome>MERCADINHO SAO LUIZ LTDA</xNome>
        <xFant>Supermercado São Luiz</xFant>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>101</cProd>
          <cEAN>7891000100103</cEAN>
          <xProd>Café Torrado e Moído 500g</xProd>
          <uCom>UN</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>19.9000</vUnCom>
          <vProd>39.80</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>202</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>Queijo Coalho Regional</xProd>
          <uCom>KG</uCom>
          <qCom>0.6500</qCom>
          <vUnCom>44.9000</vUnCom>
          <vProd>29.19</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;

interface DraftItem {
  key: number;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  category_id: string;
  product_id: string;
  gtin?: string;
}

function todayLocalISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoToLocalDate(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return todayLocalISO();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NewReceiptPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeName, setStoreName] = useState('');
  const [storeCnpj, setStoreCnpj] = useState<string | undefined>(undefined);
  const [accessKey, setAccessKey] = useState<string | undefined>(undefined);
  const [issuedDate, setIssuedDate] = useState(todayLocalISO);
  const [items, setItems] = useState<DraftItem[]>([
    {
      key: 1,
      description: '',
      quantity: '1',
      unit: 'UN',
      unit_price: '',
      category_id: '',
      product_id: '',
    },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [importedBanner, setImportedBanner] = useState<string | null>(null);
  const [isReviewingFreshImport, setIsReviewingFreshImport] = useState(false);
  const [duplicateReceipt, setDuplicateReceipt] = useState<ReceiptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestXmlFallback, setSuggestXmlFallback] = useState(false);
  const xmlInputRef = useRef<HTMLInputElement | null>(null);

  const handleDuplicateConflict = useCallback(async (err: ApiError) => {
    setScannerOpen(false);
    setError(null);
    setSuggestXmlFallback(false);

    if (err.existingReceipt) {
      setDuplicateReceipt(err.existingReceipt);
      return;
    }
    if (err.existingReceiptId) {
      try {
        const fetched = await api.getReceipt(err.existingReceiptId);
        setDuplicateReceipt(fetched);
        return;
      } catch {
        // fallback para mensagem de erro caso falhe o fetch
      }
    }
    setError(err.message);
  }, []);

  useEffect(() => {
    api
      .getCategories()
      .then(setCategories)
      .catch(() => {});
    api
      .getProducts()
      .then(setProducts)
      .catch(() => {});
  }, []);

  const populateFromImported = useCallback(
    (detail: ReceiptDetail, availableProducts: Product[]) => {
      setStoreName(detail.store.name);
      setStoreCnpj(detail.store.cnpj ?? undefined);
      setAccessKey(detail.access_key ?? undefined);
      setIssuedDate(isoToLocalDate(detail.issued_at));

      const mapped: DraftItem[] = detail.items.map((item, index) => {
        const matchedProduct = availableProducts.find(
          (p) =>
            (item.gtin && p.gtin === item.gtin) ||
            p.name.toLowerCase() === item.description.trim().toLowerCase(),
        );
        return {
          key: index + 1,
          description: item.description,
          quantity: String(item.quantity),
          unit: item.unit || 'UN',
          unit_price: String(item.unit_price),
          category_id: item.category_id ?? '',
          product_id: matchedProduct?.id ?? '',
          gtin: item.gtin ?? undefined,
        };
      });

      setItems(
        mapped.length > 0
          ? mapped
          : [
              {
                key: 1,
                description: '',
                quantity: '1',
                unit: 'UN',
                unit_price: '',
                category_id: '',
                product_id: '',
              },
            ],
      );
      setNextKey(mapped.length + 1);
      setIsReviewingFreshImport(true);
      setSuggestXmlFallback(false);
      setImportedBanner(
        'Nota importada com sucesso! Revise os itens, produtos e categorias abaixo e clique em Salvar Nota.',
      );
    },
    [],
  );

  const handleQrDetected = useCallback(
    async (detectedKey: string, qrUrl?: string) => {
      setScannerOpen(false);
      setImporting(true);
      setError(null);
      setSuggestXmlFallback(false);
      setImportedBanner(null);

      try {
        const importedDetail = await api.importReceipt({
          access_key: detectedKey,
          qr_url: qrUrl,
        });
        const latestProducts = await api.getProducts().catch(() => products);
        setProducts(latestProducts);
        populateFromImported(importedDetail, latestProducts);
        navigate('/receipts/new', { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          await handleDuplicateConflict(err);
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Falha ao consultar a NFC-e no portal da SEFAZ.',
        );
        setSuggestXmlFallback(true);
      } finally {
        setImporting(false);
      }
    },
    [handleDuplicateConflict, navigate, populateFromImported, products],
  );

  const importXmlFileObject = useCallback(
    async (file: File) => {
      setImporting(true);
      setError(null);
      setSuggestXmlFallback(false);
      setImportedBanner(null);

      try {
        const importedDetail = await api.importReceiptXml(file);
        const latestProducts = await api.getProducts().catch(() => products);
        setProducts(latestProducts);
        populateFromImported(importedDetail, latestProducts);
        navigate('/receipts/new', { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          await handleDuplicateConflict(err);
          return;
        }
        setError(err instanceof Error ? err.message : 'Falha ao importar o arquivo XML da nota.');
      } finally {
        setImporting(false);
      }
    },
    [handleDuplicateConflict, navigate, populateFromImported, products],
  );

  const handleXmlFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importXmlFileObject(file).catch(() => {});
    e.target.value = '';
  };

  const handleSampleXmlImport = () => {
    const sampleFile = new File([SAMPLE_CEARA_NFCE_XML], 'nfce-ceara-exemplo.xml', {
      type: 'application/xml',
    });
    importXmlFileObject(sampleFile).catch(() => {});
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey,
        description: '',
        quantity: '1',
        unit: 'UN',
        unit_price: '',
        category_id: '',
        product_id: '',
      },
    ]);
    setNextKey((k) => k + 1);
  };

  const removeItem = (key: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  };

  const updateItem = (
    key: number,
    field: keyof Omit<DraftItem, 'key' | 'gtin'>,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    );
  };

  const previewTotal = items.reduce((acc, item) => {
    const qty = Number.parseFloat(item.quantity.replace(',', '.'));
    const price = Number.parseFloat(item.unit_price.replace(',', '.'));
    if (Number.isFinite(qty) && Number.isFinite(price) && qty > 0 && price >= 0) {
      return acc + qty * price;
    }
    return acc;
  }, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedItems = items.map((item, idx) => {
      const quantity = Number.parseFloat(item.quantity.replace(',', '.'));
      const unit_price = Number.parseFloat(item.unit_price.replace(',', '.'));

      if (!item.description.trim()) {
        throw new Error(`Informe a descrição do item #${idx + 1}`);
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Quantidade inválida no item #${idx + 1}`);
      }
      if (!Number.isFinite(unit_price) || unit_price < 0) {
        throw new Error(`Preço unitário inválido no item #${idx + 1}`);
      }

      return {
        description: item.description.trim(),
        quantity,
        unit: item.unit || 'UN',
        unit_price,
        category_id: item.category_id ? item.category_id : undefined,
        product_id: item.product_id ? item.product_id : undefined,
        gtin: item.gtin,
      };
    });

    setSubmitting(true);
    try {
      const issuedAtIso = new Date(`${issuedDate}T12:00:00`).toISOString();
      await api.createReceipt({
        store_name: storeName.trim(),
        store_cnpj: storeCnpj,
        access_key: accessKey,
        replace_existing: isReviewingFreshImport ? true : undefined,
        issued_at: issuedAtIso,
        items: parsedItems,
      });
      navigate('/receipts');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await handleDuplicateConflict(err);
        return;
      }
      setError(err instanceof Error ? err.message : 'Erro ao salvar a nota');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    handleSubmit(e).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Erro de validação');
    });
  };

  return (
    <>
      {/* Modal de Alerta: Nota já registrada (HTTP 409) */}
      <Dialog
        open={Boolean(duplicateReceipt)}
        onOpenChange={(open) => {
          if (!open) setDuplicateReceipt(null);
        }}
      >
        <DialogContent onClose={() => setDuplicateReceipt(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <span>Nota já registrada</span>
            </DialogTitle>
            <DialogDescription>
              Esta nota fiscal (NFC-e) já foi cadastrada anteriormente no seu histórico.
            </DialogDescription>
          </DialogHeader>

          {duplicateReceipt && (
            <div className="space-y-2.5 rounded-xl border border-[#27272a] bg-[#09090b] p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Mercado:</span>
                <strong className="text-sm text-zinc-100">{duplicateReceipt.store.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Data de emissão:</span>
                <span className="font-medium text-zinc-200">
                  {formatDate(duplicateReceipt.issued_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Total da nota:</span>
                <strong className="text-base text-[#10b981]">
                  {formatCurrency(duplicateReceipt.total_amount)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Itens registrados:</span>
                <span className="text-zinc-300">{duplicateReceipt.items.length} itens</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDuplicateReceipt(null)}
            >
              Fechar
            </Button>
            {duplicateReceipt && (
              <Link
                to={`/receipts/${duplicateReceipt.id}`}
                className={cn(buttonVariants({ variant: 'default' }))}
              >
                <span>Ver Nota Existente</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          </div>
        </div>

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
              <div
                key={item.key}
                className="space-y-3 rounded-xl border border-[#27272a] bg-[#09090b]/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    ITEM #{idx + 1}
                  </Badge>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(item.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remover</span>
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-zinc-300"
                    htmlFor={`item-desc-${item.key}`}
                  >
                    Descrição do Produto *
                  </label>
                  <Input
                    id={`item-desc-${item.key}`}
                    name={`item-desc-${item.key}`}
                    type="text"
                    placeholder="Ex.: Arroz Branco Tipo 1 5kg"
                    value={item.description}
                    onChange={(e) => updateItem(item.key, 'description', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label
                      className="block text-xs font-medium text-zinc-300"
                      htmlFor={`item-price-${item.key}`}
                    >
                      Preço Unitário (R$) *
                    </label>
                    <Input
                      id={`item-price-${item.key}`}
                      name={`item-price-${item.key}`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.key, 'unit_price', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="block text-xs font-medium text-zinc-300"
                      htmlFor={`item-qty-${item.key}`}
                    >
                      Quantidade *
                    </label>
                    <Input
                      id={`item-qty-${item.key}`}
                      name={`item-qty-${item.key}`}
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, 'quantity', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="block text-xs font-medium text-zinc-300"
                      htmlFor={`item-unit-${item.key}`}
                    >
                      Unidade
                    </label>
                    <Select
                      id={`item-unit-${item.key}`}
                      name={`item-unit-${item.key}`}
                      wrapperClassName="w-full"
                      value={item.unit}
                      onChange={(e) => updateItem(item.key, 'unit', e.target.value)}
                    >
                      <option value="UN">UN (Unidade)</option>
                      <option value="KG">KG (Quilo)</option>
                      <option value="L">L (Litro)</option>
                      <option value="CX">CX (Caixa)</option>
                      <option value="PCT">PCT (Pacote)</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      className="block text-xs font-medium text-zinc-300"
                      htmlFor={`item-cat-${item.key}`}
                    >
                      Categoria
                    </label>
                    <Select
                      id={`item-cat-${item.key}`}
                      name={`item-cat-${item.key}`}
                      wrapperClassName="w-full"
                      value={item.category_id}
                      onChange={(e) => updateItem(item.key, 'category_id', e.target.value)}
                    >
                      <option value="">Sem categoria</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="block text-xs font-medium text-zinc-300"
                      htmlFor={`item-prod-${item.key}`}
                    >
                      Produto Canônico (Histórico de Preços)
                    </label>
                    <Select
                      id={`item-prod-${item.key}`}
                      name={`item-prod-${item.key}`}
                      wrapperClassName="w-full"
                      value={item.product_id}
                      onChange={(e) => updateItem(item.key, 'product_id', e.target.value)}
                    >
                      <option value="">
                        ✨ Criar novo ou vincular automaticamente por GTIN
                      </option>
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          📦 {prod.name} {prod.gtin ? `(${prod.gtin})` : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Card 3: Rodapé com Total Estimado e Botão Salvar */}
        <Card className="border-[#10b981]/35 bg-gradient-to-r from-[#10b981]/10 via-[#121215] to-[#121215]">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Total Estimado da Nota
              </div>
              <div className="text-2xl font-bold tracking-tight text-[#10b981]">
                {formatCurrency(previewTotal)}
              </div>
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Salvar Nota Fiscal</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.form>
    </>
  );
}
