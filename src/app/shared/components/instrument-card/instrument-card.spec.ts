import { TestBed } from '@angular/core/testing';

import { instrumentCard } from '../../../features/dashboard/dashboard.fixture';
import { InstrumentCard } from './instrument-card';

describe('InstrumentCard', () => {
  it('renders a generic catalog instrument and nullable evidence', async () => {
    await TestBed.configureTestingModule({ imports: [InstrumentCard] }).compileComponents();
    const fixture = TestBed.createComponent(InstrumentCard);
    fixture.componentRef.setInput('card', instrumentCard);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Test Instrument');
    expect(fixture.nativeElement.textContent).toContain('TEST/USDT');
    expect(fixture.nativeElement.textContent).toContain('No score data');
    expect(fixture.nativeElement.textContent).toContain('No open position');
  });
});
