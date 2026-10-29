import type { CategorySpending } from "./CategorySpending";
import type { MonthlySpendingPoint } from "./MonthlySpendingPoint";
import type { StoreSpending } from "./StoreSpending";

/**
 * Resposta do `GET /dashboard/summary` (suporta filtro de perÃ­odo via query `?period=month|3m|year`).
 */

export type DashboardSummary = {
  period: string,
  month_start: string,
  total_month: number,
  receipt_count: number,
  /**
   * Economia (positivo) ou gasto acima da mÃ©dia dos Ãºltimos 30 dias (negativo).
   */
  savings_amount: number,
  by_category: Array<CategorySpending>,
  by_store: Array<StoreSpending>,
  monthly_spending: Array<MonthlySpendingPoint>,
};
