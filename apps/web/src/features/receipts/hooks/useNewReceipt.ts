import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  Category,
  ImportedReceipt,
  Product,
  ReceiptDetail,
} from '@baixometro/shared-types';
import { api, ApiError } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { SAMPLE_CEARA_NFCE_XML } from '../constants';
import type { DraftItem } from '../types';
import { createEmptyDraftItem, isoToLocalDate, todayLocalISO } from '../utils';

export { SAMPLE_CEARA_NFCE_XML, todayLocalISO, isoToLocalDate };

export function useNewReceipt() {
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const xmlInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeName, setStoreName] = useState('');
  const [storeCnpj, setStoreCnpj] = useState<string | undefined>(undefined);
  const [accessKey, setAccessKey] = useState<string | undefined>(undefined);
  const [issuedDate, setIssuedDate] = useState(todayLocalISO);
  const [items, setItems] = useState<DraftItem[]>([createEmptyDraftItem(1)]);
  const [nextKey, setNextKey] = useState(2);
  const [isReviewingFreshImport, setIsReviewingFreshImport] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestXmlFallback, setSuggestXmlFallback] = useState(false);
  const [importedBanner, setImportedBanner] = useState<string | null>(null);

  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateReceipt, setDuplicateReceipt] = useState<ReceiptDetail | null>(null);
  const [sefazErrorModalOpen, setSefazErrorModalOpen] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    if (isAuthenticated) {
      api.getProducts().then(setProducts).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleDuplicateConflict = useCallback(
    async (err: ApiError) => {
      setScannerOpen(false);
      setImporting(false);
      setSubmitting(false);

      if (err.existingReceipt) {
        setDuplicateReceipt(err.existingReceipt);
        setDuplicateModalOpen(true);
        return;
      }

      if (err.existingReceiptId) {
        try {
          const detail = await api.getReceipt(err.existingReceiptId);
          setDuplicateReceipt(detail);
          setDuplicateModalOpen(true);
          return;
        } catch {
          // fallback para mensagem simples
        }
      }

      setError(err.message || 'Esta nota fiscal já foi registrada anteriormente no seu histórico.');
    },
    [],
  );

  const populateFromPreview = useCallback(
    (preview: ImportedReceipt, productCatalog: Product[]) => {
      setStoreName(preview.store_name);
      setStoreCnpj(preview.store_cnpj ?? undefined);
      setAccessKey(preview.access_key || undefined);
      setIssuedDate(isoToLocalDate(preview.issued_at));

      const mapped: DraftItem[] = preview.items.map((item, index) => {
        const matchedProduct = productCatalog.find(
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
          category_id: '',
          product_id: matchedProduct?.id ?? '',
          gtin: item.gtin ?? undefined,
        };
      });

      setItems(mapped.length > 0 ? mapped : [createEmptyDraftItem(1)]);
      setNextKey(mapped.length + 1);
      setIsReviewingFreshImport(false);
      setSuggestXmlFallback(false);
      setImportedBanner(
        'Nota lida com sucesso! Revise os itens, produtos e categorias abaixo e clique em Salvar Nota.',
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

      // Timeout de 20 segundos para evitar loading infinito caso a SEFAZ não responda
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 20000);

      try {
        const preview = await api.previewReceipt(
          {
            access_key: detectedKey,
            qr_url: qrUrl,
          },
          { signal: controller.signal },
        );
        clearTimeout(timeoutId);

        const latestProducts = isAuthenticated
          ? await api.getProducts().catch(() => products)
          : products;
        if (isAuthenticated) {
          setProducts(latestProducts);
        }
        populateFromPreview(preview, latestProducts);
        navigate('/receipts/new', { replace: true });
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        if (err instanceof ApiError && err.status === 409) {
          await handleDuplicateConflict(err);
          return;
        }

        const isTimeout =
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && err.name === 'AbortError');

        const is422 = err instanceof ApiError && err.status === 422;

        let message =
          'Não foi possível ler o QR Code (SEFAZ instável). Você pode tentar novamente ou importar o XML da nota.';

        if (isTimeout) {
          message =
            'Tempo limite de 20 segundos atingido ao consultar a SEFAZ. O portal fiscal pode estar instável ou sobrecarregado.';
        } else if (err instanceof ApiError && err.message) {
          message = err.message;
        } else if (err instanceof Error && err.message) {
          message = err.message;
        }

        setError(message);
        setSuggestXmlFallback(true);

        if (isTimeout || is422) {
          setSefazErrorModalOpen(true);
        }
      } finally {
        setImporting(false);
      }
    },
    [handleDuplicateConflict, isAuthenticated, navigate, populateFromPreview, products],
  );

  const importXmlFileObject = useCallback(
    async (file: File) => {
      setImporting(true);
      setError(null);
      setSuggestXmlFallback(false);
      setImportedBanner(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 20000);

      try {
        const preview = await api.previewReceiptXml(file, { signal: controller.signal });
        clearTimeout(timeoutId);

        const latestProducts = isAuthenticated
          ? await api.getProducts().catch(() => products)
          : products;
        if (isAuthenticated) {
          setProducts(latestProducts);
        }
        populateFromPreview(preview, latestProducts);
        navigate('/receipts/new', { replace: true });
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        if (err instanceof ApiError && err.status === 409) {
          await handleDuplicateConflict(err);
          return;
        }
        setError(err instanceof Error ? err.message : 'Falha ao importar o arquivo XML da nota.');
      } finally {
        setImporting(false);
      }
    },
    [handleDuplicateConflict, isAuthenticated, navigate, populateFromPreview, products],
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
    setItems((prev) => [...prev, createEmptyDraftItem(nextKey)]);
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

  const persistReceiptPayload = async (
    parsedItems: {
      description: string;
      quantity: number;
      unit: string;
      unit_price: number;
      category_id?: string;
      product_id?: string;
      gtin?: string;
    }[],
  ) => {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!storeName.trim()) {
      throw new Error('Informe o nome do supermercado.');
    }

    const parsedItems = items.map((item, idx) => {
      const description = item.description.trim();
      if (!description) {
        throw new Error(`Informe a descrição do item #${idx + 1}.`);
      }
      const quantity = Number.parseFloat(item.quantity.replace(',', '.'));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Quantidade inválida para "${description}".`);
      }
      const unit_price = Number.parseFloat(item.unit_price.replace(',', '.'));
      if (!Number.isFinite(unit_price) || unit_price < 0) {
        throw new Error(`Preço unitário inválido para "${description}".`);
      }

      return {
        description,
        quantity,
        unit: item.unit.trim().toUpperCase() || 'UN',
        unit_price,
        category_id: item.category_id || undefined,
        product_id: item.product_id || undefined,
        gtin: item.gtin || undefined,
      };
    });

    if (parsedItems.length === 0) {
      throw new Error('Adicione ao menos um item à nota fiscal.');
    }

    if (!isAuthenticated) {
      openAuthModal({
        defaultTab: 'register',
        onSuccess: async () => {
          await persistReceiptPayload(parsedItems);
        },
      });
      return;
    }

    await persistReceiptPayload(parsedItems);
  };

  const handleFormSubmit = (e: FormEvent) => {
    handleSubmit(e).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Erro de validação');
    });
  };

  return {
    xmlInputRef,
    storeName,
    setStoreName,
    storeCnpj,
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
  };
}
