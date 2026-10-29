import type { ReceiptItem } from "./ReceiptItem";
import type { Store } from "./Store";

/**
 * Nota completa com mercado e itens (resposta do `POST /receipts`).
 */

export type ReceiptDetail = {
  store: Store,
  items: Array<ReceiptItem>,
  id: string,
  user_id: string,
  store_id: string,
  issued_at: string,
  total_amount: number,
  access_key: string | null,
  created_at: string,
};
