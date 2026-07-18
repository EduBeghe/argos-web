export function formatDecimal(value: string | null, maximumFractionDigits = 8): string {
  if (value === null) return 'Sin datos';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits }).format(Number(value));
}

export function formatCurrency(value: string | null, currency = 'USDT'): string {
  if (value === null) return 'Sin datos';
  return `${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))} ${currency}`;
}

export function formatPercentage(value: string | null): string {
  if (value === null) return 'Sin datos';
  return new Intl.NumberFormat('es-AR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatQuantity(value: string | null): string {
  if (value === null) return 'Sin datos';
  const absolute = Math.abs(Number(value));
  return formatDecimal(value, absolute > 0 && absolute < 0.01 ? 8 : 4);
}
