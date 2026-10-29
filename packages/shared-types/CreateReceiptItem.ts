export type CreateReceiptItem = {
  description: string,
  quantity: number,
  /**
   * Unidade de medida (UN, KG, L...). PadrÃ£o: `UN`.
   */
  unit?: string,
  unit_price: number,
  category_id?: string,
  gtin?: string,
  /**
   * VÃ­nculo manual opcional com um produto existente.
   */
  product_id?: string,
};
