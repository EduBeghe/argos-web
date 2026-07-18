import {
  decimalValueTone,
  formatCurrency,
  formatPercentage,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercentage,
} from './decimal-format';

describe('decimal formatting', () => {
  it('formats currency, percentages, nulls and small quantities for display', () => {
    expect(formatCurrency('1234.56789', 'USDT')).toBe('1,234.57 USDT');
    expect(formatPercentage('0.125')).toBe('12.50%');
    expect(formatCurrency(null)).toBe('No data');
    expect(formatQuantity('0.000012345678')).toBe('0.00001235');
  });

  it('classifies normal and scientific Decimal strings without numeric conversion', () => {
    expect(decimalValueTone('0')).toBe('neutral');
    expect(decimalValueTone('0.000')).toBe('neutral');
    expect(decimalValueTone('0E-18')).toBe('neutral');
    expect(decimalValueTone('-0E-18')).toBe('neutral');
    expect(decimalValueTone('1E-18')).toBe('positive');
    expect(decimalValueTone('-1E-18')).toBe('negative');
    expect(decimalValueTone('12.50')).toBe('positive');
    expect(decimalValueTone('-12.50')).toBe('negative');
    expect(decimalValueTone('  +1.0E+3  ')).toBe('positive');
    expect(decimalValueTone('not-a-decimal')).toBe('neutral');
  });

  it('visibly signs normal, zero, and scientific Decimal strings', () => {
    expect(formatSignedCurrency('200', 'USDT')).toBe('+200.00 USDT');
    expect(formatSignedCurrency('-200', 'USDT')).toBe('-200.00 USDT');
    expect(formatSignedCurrency('0E-18', 'USDT')).toBe('±0.00 USDT');
    expect(formatSignedPercentage('-0E-18')).toBe('±0.00%');
    expect(formatSignedCurrency('1.2500E+3', 'USDT')).toBe('+1,250.00 USDT');
    expect(formatSignedPercentage('-1E-18')).toBe('-0.00%');
  });
});
