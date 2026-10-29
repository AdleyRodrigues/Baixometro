import type { ImportedItem } from "./ImportedItem";

/**
 * Dados completos extraídos de uma nota fiscal antes da persistência no banco.
 */

export type ImportedReceipt = {
  store_name: string,
  store_cnpj: string | null,
  issued_at: string,
  access_key: string,
  items: Array<ImportedItem>,
};
