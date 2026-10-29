const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatCurrency(value: number): string {
  return brlFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return Number.isNaN(d.getTime()) ? isoString : dateFormatter.format(d);
}

export function formatMonthYear(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const text = monthYearFormatter.format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

