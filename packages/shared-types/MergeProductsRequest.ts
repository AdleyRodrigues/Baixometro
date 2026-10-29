/**
 * Payload do `POST /products/merge`.
 */

export type MergeProductsRequest = {
  source_product_id: string,
  target_product_id: string,
};
