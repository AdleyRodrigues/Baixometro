/**
 * Alerta de alta de preÃ§o (> 10% acima da mÃ©dia dos Ãºltimos 30 dias).
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
