export type CategorySpending = {
  /**
   * `null` agrupa os itens sem categoria.
   */
  category_id: string | null,
  name: string,
  color: string,
  icon: string,
  total: number,
};
