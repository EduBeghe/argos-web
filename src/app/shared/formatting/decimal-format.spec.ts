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

  it('classifies and visibly signs positive, negative, and neutral Decimal strings', () => {
    expect(decimalValueTone('0.010')).toBe('positive');
    expect(decimalValueTone('-0.010')).toBe('negative');
    expect(decimalValueTone('0.000')).toBe('neutral');
    expect(formatSignedCurrency('200', 'USDT')).toBe('+200.00 USDT');
    expect(formatSignedCurrency('-200', 'USDT')).toBe('-200.00 USDT');
    expect(formatSignedPercentage('0')).toBe('±0.00%');
  });
});
