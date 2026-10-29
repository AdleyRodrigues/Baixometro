/**
 * Alerta de alta de preço (> 10% acima da média dos últimos 30 dias).
 */

export type PriceAlert = {
  product_id: string,
  product_name: string,
  store_name: string,
  previous_avg_price: number,
  current_price: number,
  variation_pct: number,
  observed_at: string,
};
