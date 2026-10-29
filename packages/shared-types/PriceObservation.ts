/**
 * Observação histórica de preço vinculada a um produto, mercado e item de nota.
 */

export type PriceObservation = {
  id: string,
  product_id: string,
  store_id: string,
  receipt_item_id: string,
  unit_price: number,
  unit_price_per_kg_l: number | null,
  observed_at: string,
};
