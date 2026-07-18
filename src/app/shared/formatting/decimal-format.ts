export function formatDecimal(value: string | null, maximumFractionDigits = 8): string {
  if (value === null) return 'No data';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(Number(value));
}

export function formatCurrency(value: string | null, currency = 'USDT'): string {
  if (value === null) return 'No data';
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))} ${currency}`;
}

export function formatPercentage(value: string | null): string {
  if (value === null) return 'No data';
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatQuantity(value: string | null): string {
  if (value === null) return 'No data';
  const absolute = Math.abs(Number(value));
  return formatDecimal(value, absolute > 0 && absolute < 0.01 ? 8 : 4);
}

export type DecimalValueTone = 'positive' | 'negative' | 'neutral';

export function decimalValueTone(value: string): DecimalValueTone {
  const normalized = value.trim();
  const magnitude = normalized.replace(/^[+-]/, '').replace('.', '').replace(/0/g, '');
  if (!magnitude) return 'neutral';
  return normalized.startsWith('-') ? 'negative' : 'positive';
}

export function formatSignedCurrency(value: string, currency = 'USDT'): string {
  const formatted = formatCurrency(value, currency);
  if (decimalValueTone(value) === 'neutral') return `±${formatted}`;
  return decimalValueTone(value) === 'positive' ? `+${formatted}` : formatted;
}

export function formatSignedPercentage(value: string): string {
  const formatted = formatPercentage(value);
  if (decimalValueTone(value) === 'neutral') return `±${formatted}`;
  return decimalValueTone(value) === 'positive' ? `+${formatted}` : formatted;
}
