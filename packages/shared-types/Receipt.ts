export type Receipt = {
  id: string,
  user_id: string,
  store_id: string,
  issued_at: string,
  total_amount: number,
  access_key: string | null,
  created_at: string,
};
