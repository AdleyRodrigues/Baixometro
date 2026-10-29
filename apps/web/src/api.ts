import type {
  Category,
  CreateCategory,
  CreateReceipt,
  DashboardSummary,
  ErrorResponse,
  HealthResponse,
  ImportReceiptRequest,
  PriceAlert,
  Product,
  ProductPriceHistory,
  ReceiptDetail,
  ReceiptSummary,
} from '@baixometro/shared-types';

export type DashboardPeriod = 'month' | '3m' | 'year';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Erro HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as ErrorResponse;
      if (errBody?.error) {
        message = errBody.error;
      }
    } catch {
      // ignora erro de parse
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export const api = {
  getHealth: () => request<HealthResponse>('/health'),
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (payload: CreateCategory) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getReceipts: () => request<ReceiptSummary[]>('/receipts'),
  getReceipt: (receiptId: string) => request<ReceiptDetail>(`/receipts/${receiptId}`),
  createReceipt: (payload: CreateReceipt) =>
    request<ReceiptDetail>('/receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  importReceipt: (payload: ImportReceiptRequest) =>
    request<ReceiptDetail>('/receipts/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  importReceiptXml: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<ReceiptDetail>('/receipts/import/xml', {
      method: 'POST',
      body: formData,
    });
  },
  getProducts: () => request<Product[]>('/products'),
  getProductHistory: (productId: string) =>
    request<ProductPriceHistory>(`/products/${productId}/history`),
  getAlerts: () => request<PriceAlert[]>('/alerts'),
  getDashboardSummary: (period: DashboardPeriod = 'month') =>
    request<DashboardSummary>(`/dashboard/summary?period=${period}`),
};
