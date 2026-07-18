import { formatCurrency, formatPercentage, formatQuantity } from './decimal-format';

describe('decimal formatting', () => {
  it('formats currency, percentages, nulls and small quantities for display', () => {
    expect(formatCurrency('1234.56789', 'USDT')).toContain('1.234,57');
    expect(formatPercentage('0.125')).toContain('12,50');
    expect(formatCurrency(null)).toBe('Sin datos');
    expect(formatQuantity('0.000012345678')).toContain('0,00001235');
  });
});
