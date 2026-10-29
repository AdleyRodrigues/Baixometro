/**
 * Item extraído de uma NFC-e (via XML ou consulta SEFAZ).
 */

export type ImportedItem = {
  description: string,
  quantity: number,
  unit: string,
  unit_price: number,
  gtin: string | null,
};
