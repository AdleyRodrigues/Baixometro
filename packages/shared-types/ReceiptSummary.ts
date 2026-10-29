/**
 * Linha do histórico (`GET /receipts`).
 */

export type ReceiptSummary = {
  id: string,
  store_id: string,
  store_name: string,
  issued_at: string,
  total_amount: number,
  item_count: number,
  access_key: string | null,
  created_at: string,
};
