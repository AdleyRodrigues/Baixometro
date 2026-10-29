import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category, Product, ReceiptDetail } from '@baixometro/shared-types';
import { api } from '../api';
import QrScannerModal from '../components/QrScannerModal';
import { formatCurrency } from '../format';

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
  const [error, setError] = useState<string | null>(null);
  const [suggestXmlFallback, setSuggestXmlFallback] = useState(false);
  const xmlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api
      .getCategories()
      .then(setCategories)
      .catch(() => {
        // categorias são opcionais no preenchimento
      });
    api
      .getProducts()
      .then(setProducts)
      .catch(() => {
        // produtos são opcionais no preenchimento
      });
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
      setSuggestXmlFallback(false);
      setImportedBanner(
        'Nota importada com sucesso! Revise os campos abaixo (produtos e categorias) e clique em Salvar Nota para confirmar.',
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
    [navigate, populateFromImported, products],
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
        setError(err instanceof Error ? err.message : 'Falha ao importar o arquivo XML da nota.');
      } finally {
        setImporting(false);
      }
    },
    [navigate, populateFromImported, products],
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
        issued_at: issuedAtIso,
        items: parsedItems,
      });
      navigate('/receipts');
    } catch (err) {
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
        style={{ display: 'none' }}
      />

      <form
        onSubmit={handleFormSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div className="section-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="section-title" style={{ fontSize: '1.25rem' }}>
              {accessKey ? 'Revisar Nota Importada' : 'Nova Nota'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              Escaneie o QR Code da NFC-e, importe o XML oficial ou preencha manualmente
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setScannerOpen(true)}
              disabled={importing}
            >
              📷 {importing ? 'Importando...' : 'Escanear QR Code'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => xmlInputRef.current?.click()}
              disabled={importing}
            >
              📄 Importar XML da Nota
            </button>
          </div>
        </div>

        {importedBanner && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#7dd3fc',
              fontSize: '0.875rem',
            }}
          >
            {importedBanner}
          </div>
        )}

        {error && (
          <div
            className="alert-error"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
          >
            <div>{error}</div>
            {suggestXmlFallback && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid rgba(248, 113, 113, 0.25)',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: '#fecaca' }}>
                  💡 <strong>Dica:</strong> Se o portal da SEFAZ estiver fora do ar ou exigindo Captcha,
                  você pode importar diretamente o arquivo <strong>.xml</strong> da NFC-e:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => xmlInputRef.current?.click()}
                    disabled={importing}
                  >
                    📄 Enviar XML da Nota (.xml)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSampleXmlImport}
                    disabled={importing}
                  >
                    🧪 Testar com XML de Exemplo (SEFAZ-CE)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <section className="card">
          <div className="field">
            <label className="field-label" htmlFor="store-name">
              Nome do Mercado *
            </label>
            <input
              id="store-name"
              className="input"
              type="text"
              placeholder="Ex.: Supermercado Central"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="issued-date">
              Data da Compra *
            </label>
            <input
              id="issued-date"
              className="input"
              type="date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
              required
            />
          </div>

          {accessKey && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', wordBreak: 'break-all' }}>
              🔑 Chave NFC-e: <strong style={{ color: '#cbd5e1' }}>{accessKey}</strong>
            </div>
          )}
        </section>

        <section className="card">
          <div className="section-header">
            <h2 className="section-title">Itens ({items.length})</h2>
            <button type="button" className="btn btn-secondary" onClick={addItem}>
              + Adicionar item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {items.map((item, idx) => (
              <div
                key={item.key}
                style={{
                  padding: '0.875rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div className="section-header">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                    ITEM #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => removeItem(item.key)}
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor={`item-desc-${item.key}`}>
                    Descrição *
                  </label>
                  <input
                    id={`item-desc-${item.key}`}
                    name={`item-desc-${item.key}`}
                    className="input"
                    type="text"
                    placeholder="Ex.: Arroz Branco 5kg"
                    value={item.description}
                    onChange={(e) => updateItem(item.key, 'description', e.target.value)}
                    required
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 1fr',
                    gap: '0.5rem',
                  }}
                >
                  <div className="field">
                    <label className="field-label" htmlFor={`item-qty-${item.key}`}>
                      Qtd *
                    </label>
                    <input
                      id={`item-qty-${item.key}`}
                      name={`item-qty-${item.key}`}
                      className="input"
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, 'quantity', e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor={`item-unit-${item.key}`}>
                      Unid.
                    </label>
                    <select
                      id={`item-unit-${item.key}`}
                      name={`item-unit-${item.key}`}
                      className="select"
                      value={item.unit}
                      onChange={(e) => updateItem(item.key, 'unit', e.target.value)}
                    >
                      <option value="UN">UN</option>
                      <option value="KG">KG</option>
                      <option value="L">L</option>
                      <option value="CX">CX</option>
                      <option value="PCT">PCT</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor={`item-price-${item.key}`}>
                      Preço Unit. (R$) *
                    </label>
                    <input
                      id={`item-price-${item.key}`}
                      name={`item-price-${item.key}`}
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.key, 'unit_price', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor={`item-cat-${item.key}`}>
                    Categoria
                  </label>
                  <select
                    id={`item-cat-${item.key}`}
                    name={`item-cat-${item.key}`}
                    className="select"
                    value={item.category_id}
                    onChange={(e) => updateItem(item.key, 'category_id', e.target.value)}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor={`item-prod-${item.key}`}>
                    Produto Canônico (Vínculo / Histórico)
                  </label>
                  <select
                    id={`item-prod-${item.key}`}
                    name={`item-prod-${item.key}`}
                    className="select"
                    value={item.product_id}
                    onChange={(e) => updateItem(item.key, 'product_id', e.target.value)}
                  >
                    <option value="">
                      ✨ Criar novo produto (ou vincular automaticamente por GTIN/Alias)
                    </option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        📦 {prod.name} {prod.gtin ? `(${prod.gtin})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div
          className="card"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div className="kpi-label">Total estimado</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>
              {formatCurrency(previewTotal)}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar Nota'}
          </button>
        </div>
      </form>
    </>
  );
}
