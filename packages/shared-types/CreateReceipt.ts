import type { CreateReceiptItem } from "./CreateReceiptItem";

/**
 * Payload do `POST /receipts`. O mercado Ã© localizado (CNPJ ou nome) ou criado.
 * `total_amount` e `total_price` sÃ£o calculados no servidor.
 */

export type CreateReceipt = {
  store_name: string,
  store_cnpj?: string,
  issued_at: string,
  access_key?: string,
  /**
   * Quando `true` (apenas no passo de revisÃ£o pÃ³s-importaÃ§Ã£o), substitui a nota recÃ©m-importada.
   */
  replace_existing?: boolean,
  items: Array<CreateReceiptItem>,
};
