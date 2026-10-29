/**
 * Item retornado pela busca pública de preços (`GET /public/prices/search?q=...`).
 */

export type PublicPriceSearchItem = {
  product_id: string,
  product_name: string,
  product_brand: string | null,
  gtin: string | null,
  store_name: string,
  unit_price: number,
  unit_price_per_kg_l: number | null,
  observed_at: string,
};
