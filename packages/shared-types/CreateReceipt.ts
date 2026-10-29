import type { CreateReceiptItem } from "./CreateReceiptItem";

/**
 * Payload do `POST /receipts`. O mercado é localizado (CNPJ ou nome) ou criado.
 * `total_amount` e `total_price` são calculados no servidor.
 */

export type CreateReceipt = {
  store_name: string,
  store_cnpj?: string,
  issued_at: string,
  access_key?: string,
  /**
   * Quando `true` (apenas no passo de revisão pós-importação), substitui a nota recém-importada.
   */
  replace_existing?: boolean,
  items: Array<CreateReceiptItem>,
};
