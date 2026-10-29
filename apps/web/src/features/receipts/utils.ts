export function todayLocalISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isoToLocalDate(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return todayLocalISO();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createEmptyDraftItem(key = 1) {
  return {
    key,
    description: '',
    quantity: '1',
    unit: 'UN',
    unit_price: '',
    category_id: '',
    product_id: '',
  };
}

