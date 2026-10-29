import type { PriceHistoryPoint } from "./PriceHistoryPoint";
import type { Product } from "./Product";

/**
 * Resposta do `GET /products/:id/history`.
 */

export type ProductPriceHistory = {
  product: Product,
  observations: Array<PriceHistoryPoint>,
};
