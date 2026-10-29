/**
 * Ponto da evolução mensal real de gastos no Dashboard.
 */

export type MonthlySpendingPoint = {
  /**
   * Rótulo abreviado do mês (ex.: `Out/26`).
   */
  month: string,
  total: number,
};
