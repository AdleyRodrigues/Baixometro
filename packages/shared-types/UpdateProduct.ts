/**
 * Payload do `PUT /products/:id`.
 */

export type UpdateProduct = {
  name: string,
  brand?: string,
  gtin?: string,
};
