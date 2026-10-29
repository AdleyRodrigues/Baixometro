export type CreateReceiptItem = {
  description: string,
  quantity: number,
  /**
   * Unidade de medida (UN, KG, L...). Padrão: `UN`.
   */
  unit?: string,
  unit_price: number,
  category_id?: string,
  gtin?: string,
  /**
   * Vínculo manual opcional com um produto existente.
   */
  product_id?: string,
};
