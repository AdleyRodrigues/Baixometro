export type CreateCategory = {
  name: string,
  /**
   * Cor hexadecimal `#RRGGBB`. Padrão: `#64748b`.
   */
  color?: string,
  /**
   * Emoji/ícone. Padrão: 🛒.
   */
  icon?: string,
};
