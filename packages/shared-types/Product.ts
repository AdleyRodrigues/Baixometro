/**
 * Catálogo de produtos. Alimentado a partir de itens com GTIN ou aliases.
 */

export type Product = {
  id: string,
  gtin: string | null,
  name: string,
  brand: string | null,
  created_at: string,
  observation_count: number,
};
