import type {
  AuthResponse,
  Category,
  CreateCategory,
  CreateReceipt,
  DashboardSummary,
  ErrorResponse,
  HealthResponse,
  ImportedReceipt,
  ImportReceiptRequest,
  LoginRequest,
  MergeProductsRequest,
  PriceAlert,
  Product,
  ProductPriceHistory,
  PublicPriceSearchItem,
  ReceiptDetail,
  ReceiptSummary,
  RegisterRequest,
  UpdateCategory,
  UpdateProduct,
  UpdateUserSettingsRequest,
  User,
} from '@baixometro/shared-types';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  UNAUTHORIZED_EVENT,
} from './context/AuthContext';

export type DashboardPeriod = 'month' | '3m' | 'year';

export class ApiError extends Error {
  status: number;
  existingReceiptId?: string;
  existingReceipt?: ReceiptDetail;

  constructor(
    message: string,
    status: number,
    existingReceiptId?: string,
    existingReceipt?: ReceiptDetail,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.existingReceiptId = existingReceiptId;
    this.existingReceipt = existingReceipt;
  }
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(AUTH_TOKEN_KEY)
      : null;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Erro HTTP ${res.status}`;
    let existingReceiptId: string | undefined;
    let existingReceipt: ReceiptDetail | undefined;

    try {
      const errBody = (await res.json()) as ErrorResponse;
      if (errBody?.error) {
        message = errBody.error;
      }
      if (errBody?.existing_receipt_id) {
        existingReceiptId = errBody.existing_receipt_id;
      }
      if (errBody?.existing_receipt) {
        existingReceipt = errBody.existing_receipt;
      }
    } catch {
      // ignora erro de parse
    }

    if (res.status === 401 && !path.startsWith('/auth/')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
    }

    throw new ApiError(message, res.status, existingReceiptId, existingReceipt);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const api = {
  getHealth: () => request<HealthResponse>('/health'),
  register: (payload: RegisterRequest) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginRequest) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUserSettings: (payload: UpdateUserSettingsRequest) =>
    request<User>('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (payload: CreateCategory) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCategory: (id: string, payload: UpdateCategory) =>
    request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCategory: (id: string) =>
    request<void>(`/categories/${id}`, {
      method: 'DELETE',
    }),
  getReceipts: () => request<ReceiptSummary[]>('/receipts'),
  getReceipt: (receiptId: string) => request<ReceiptDetail>(`/receipts/${receiptId}`),
  createReceipt: (payload: CreateReceipt) =>
    request<ReceiptDetail>('/receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  previewReceipt: (payload: ImportReceiptRequest, init?: RequestInit) =>
    request<ImportedReceipt>('/receipts/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...init,
    }),
  previewReceiptXml: (file: File, init?: RequestInit) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<ImportedReceipt>('/receipts/preview', {
      method: 'POST',
      body: formData,
      ...init,
    });
  },
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
  updateProduct: (id: string, payload: UpdateProduct) =>
    request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  mergeProducts: (payload: MergeProductsRequest) =>
    request<Product>('/products/merge', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteProduct: (id: string) =>
    request<void>(`/products/${id}`, {
      method: 'DELETE',
    }),
  getAlerts: () => request<PriceAlert[]>('/alerts'),
  getDashboardSummary: (period: DashboardPeriod = '3m') =>
    request<DashboardSummary>(`/dashboard/summary?period=${period}`),
  searchPublicPrices: (query = '') =>
    request<PublicPriceSearchItem[]>(
      `/public/prices/search?q=${encodeURIComponent(query)}`,
    ),
};
