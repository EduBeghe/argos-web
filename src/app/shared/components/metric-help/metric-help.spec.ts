import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectTypeOf } from 'vitest';

import { METRIC_DEFINITIONS, MetricKey, metricDefinition } from '../../metrics/metric-definitions';
import { MetricHelp } from './metric-help';

describe('MetricHelp', () => {
  async function render(
    metric: MetricKey = 'maximumDrawdown',
  ): Promise<ComponentFixture<MetricHelp>> {
    await TestBed.configureTestingModule({ imports: [MetricHelp] }).compileComponents();
    const fixture = TestBed.createComponent(MetricHelp);
    fixture.componentRef.setInput('metric', metric);
    fixture.detectChanges();
    return fixture;
  }

  it('uses a keyboard-focusable trigger with an accessible name', async () => {
    const fixture = await render();
    const trigger = fixture.nativeElement.querySelector('button');

    expect(trigger.tabIndex).toBe(0);
    expect(trigger.getAttribute('aria-label')).toBe('Learn about Maximum drawdown');
  });

  it('exposes the centralized explanation on hover and connects it with ARIA', async () => {
    const fixture = await render();
    const trigger = fixture.nativeElement.querySelector('button');

    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const bubble = fixture.nativeElement.querySelector('[role="tooltip"]');
    expect(bubble.textContent).toContain(metricDefinition('maximumDrawdown').explanation);
    expect(trigger.getAttribute('aria-describedby')).toBe(bubble.id);
  });

  it('exposes help on focus and closes it when focus leaves', async () => {
    const fixture = await render('equity');
    const trigger = fixture.nativeElement.querySelector('button');

    trigger.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();

    trigger.dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('toggles on click or tap and closes with Escape', async () => {
    const fixture = await render('signalStrength');
    const trigger = fixture.nativeElement.querySelector('button');

    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();

    trigger.click();
    fixture.detectChanges();
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('closes when the user points elsewhere', async () => {
    const fixture = await render('currentCash');
    const trigger = fixture.nativeElement.querySelector('button');

    trigger.click();
    fixture.detectChanges();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('does not expose hidden explanation content to the accessibility tree', async () => {
    const fixture = await render('totalPnl');
    const trigger = fixture.nativeElement.querySelector('button');

    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
    expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain(
      metricDefinition('totalPnl').explanation,
    );
  });

  it('uses one shared definition for repeated metric instances', async () => {
    const first = metricDefinition('fees');
    const second = metricDefinition('fees');

    expect(first).toBe(second);
    expect(first).toBe(METRIC_DEFINITIONS.fees);
  });

  it('keeps unknown metric keys outside the typed public API', () => {
    expectTypeOf<'unknownMetric'>().not.toMatchTypeOf<MetricKey>();
    expectTypeOf<'equity'>().toMatchTypeOf<MetricKey>();
  });
});
