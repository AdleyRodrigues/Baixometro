export type ReceiptItem = {
  id: string,
  receipt_id: string,
  category_id: string | null,
  description: string,
  quantity: number,
  unit: string,
  unit_price: number,
  total_price: number,
  gtin: string | null,
};
