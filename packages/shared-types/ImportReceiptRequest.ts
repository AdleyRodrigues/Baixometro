/**
 * Payload do `POST /receipts/import`.
 */

export type ImportReceiptRequest = {
  /**
   * Pode ser a chave de 44 dÃ­gitos ou a URL completa lida do QR Code da NFC-e.
   */
  access_key: string,
  /**
   * URL completa do QR Code da SEFAZ (opcional).
   */
  qr_url?: string,
};
