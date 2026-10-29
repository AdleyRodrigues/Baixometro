import type { ErrorDetail } from "./ErrorDetail";
import type { ReceiptDetail } from "./ReceiptDetail";

/**
 * Corpo padrão das respostas de erro da API.
 */

export type ErrorResponse = {
  error: ErrorDetail,
  existing_receipt_id?: string,
  existing_receipt?: ReceiptDetail,
};
