import { TestBed } from '@angular/core/testing';

import { ReturnComparisonChart } from './return-comparison-chart';

describe('ReturnComparisonChart', () => {
  it('renders authoritative text, a zero reference and positive/negative bars', () => {
    const fixture = TestBed.createComponent(ReturnComparisonChart);
    fixture.componentRef.setInput('strategyReturn', '0.0125');
    fixture.componentRef.setInput('benchmarkReturn', '-0.005');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Strategy: +1.25%');
    expect(fixture.nativeElement.textContent).toContain('Buy-and-hold: -0.50%');
    expect(fixture.nativeElement.querySelector('.zero')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('rect.bar')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('title').textContent).toContain('Strategy versus');
  });
});
