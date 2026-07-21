import { TestBed } from '@angular/core/testing';

import { EdgeEvidenceChart } from './edge-evidence-chart';
import { SegmentMetrics, WindowEvidence } from './strategy-research.models';

const metrics = (segment: SegmentMetrics['segment'], difference: string): SegmentMetrics => ({
  segment,
  total_return: difference,
  max_drawdown: '-0.01',
  trade_count: 2,
  fees_paid: '1.25',
  return_difference_from_production: difference,
  return_difference_from_buy_and_hold: '0.001',
});

describe('EdgeEvidenceChart', () => {
  it('renders validation and test evidence and preserves missing-test gaps', () => {
    const fixture = TestBed.createComponent(EdgeEvidenceChart);
    const windows: WindowEvidence[] = [
      {
        window_ordinal: 1,
        volatility_threshold: '0.02',
        training_metrics: metrics('training', '0.01'),
        validation_metrics: metrics('validation', '0.02'),
        test_metrics: metrics('test', '0.03'),
        validation_passed: true,
        test_confirmed: true,
      },
      {
        window_ordinal: 2,
        volatility_threshold: '0.02',
        training_metrics: metrics('training', '0.01'),
        validation_metrics: metrics('validation', '-0.01'),
        test_metrics: null,
        validation_passed: false,
        test_confirmed: false,
      },
    ];
    fixture.componentRef.setInput('windows', windows);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Window 1 validation: 2%');
    expect(text).toContain('Window 1 test: 3%');
    expect(text).not.toContain('Window 2 test');
    expect(fixture.nativeElement.querySelectorAll('circle.validation')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('circle.test')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('svg').innerHTML).not.toMatch(/NaN|Infinity/);
  });
});
