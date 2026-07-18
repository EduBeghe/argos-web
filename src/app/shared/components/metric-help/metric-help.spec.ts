import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectTypeOf } from 'vitest';

import { METRIC_DEFINITIONS, MetricKey, metricDefinition } from '../../metrics/metric-definitions';
import { MetricHelp } from './metric-help';

describe('MetricHelp', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

  it('keeps hover help open while the pointer crosses the gap into the tooltip', async () => {
    vi.useFakeTimers();
    const fixture = await render();
    const trigger = fixture.nativeElement.querySelector('button');

    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('[role="tooltip"]');
    trigger.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.body }));
    bubble.dispatchEvent(new MouseEvent('mouseenter', { relatedTarget: trigger }));
    vi.advanceTimersByTime(50);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();
  });

  it('closes hover help after the pointer leaves both trigger and tooltip', async () => {
    vi.useFakeTimers();
    const fixture = await render();
    const trigger = fixture.nativeElement.querySelector('button');

    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('[role="tooltip"]');
    trigger.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: bubble }));
    bubble.dispatchEvent(new MouseEvent('mouseenter', { relatedTarget: trigger }));
    bubble.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.body }));
    vi.advanceTimersByTime(50);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
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

  it('keeps click-pinned help open through mouseleave and closes it with Escape', async () => {
    vi.useFakeTimers();
    const fixture = await render('signalStrength');
    const trigger = fixture.nativeElement.querySelector('button');

    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();
    trigger.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.body }));
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('closes click-pinned help when the user points elsewhere', async () => {
    const fixture = await render('currentCash');
    const trigger = fixture.nativeElement.querySelector('button');

    trigger.click();
    fixture.detectChanges();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('uses native Enter and Space activation as a predictable pinned toggle', async () => {
    const fixture = await render('currentDrawdown');
    const trigger = fixture.nativeElement.querySelector('button');

    trigger.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    trigger.click();
    fixture.detectChanges();
    trigger.dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('clamps actual tooltip dimensions inside a narrow viewport', async () => {
    const fixture = await render('maximumDrawdown');
    const trigger = fixture.nativeElement.querySelector('button');
    mockViewport(300, 400);
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 270, y: 100, width: 20, height: 20 }),
    );
    trigger.click();
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('.metric-help-bubble');
    mockTooltipSize(bubble, 276, 180);

    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    const left = Number.parseFloat(bubble.style.left);
    const top = Number.parseFloat(bubble.style.top);
    const width = Number.parseFloat(bubble.style.width);
    const maxHeight = Number.parseFloat(bubble.style.maxHeight);
    expect(left).toBeGreaterThanOrEqual(12);
    expect(left + width).toBeLessThanOrEqual(288);
    expect(top).toBeGreaterThanOrEqual(12);
    expect(top + Math.min(180, maxHeight)).toBeLessThanOrEqual(388);
  });

  it('places an actual-height tooltip safely above a trigger near the bottom', async () => {
    const fixture = await render('totalReturn');
    const trigger = fixture.nativeElement.querySelector('button');
    mockViewport(800, 600);
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 400, y: 560, width: 20, height: 20 }),
    );
    trigger.click();
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('.metric-help-bubble');
    mockTooltipSize(bubble, 320, 200);

    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    const top = Number.parseFloat(bubble.style.top);
    expect(top).toBeGreaterThanOrEqual(12);
    expect(top + 200).toBeLessThanOrEqual(552);
  });

  it('constrains long help, preserves scrolling, and closes on page scroll', async () => {
    const fixture = await render('overallScore');
    const trigger = fixture.nativeElement.querySelector('button');
    mockViewport(320, 300);
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 150, y: 140, width: 20, height: 20 }),
    );
    trigger.click();
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('.metric-help-bubble');
    mockTooltipSize(bubble, 296, 500);

    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    expect(Number.parseFloat(bubble.style.maxHeight)).toBeLessThan(500);
    expect(bubble.scrollHeight).toBe(500);
    expect(getComputedStyle(bubble).overflow).toBe('auto');

    window.dispatchEvent(new Event('scroll'));
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

function mockViewport(width: number, height: number): void {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height);
}

function mockTooltipSize(element: HTMLElement, width: number, height: number): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ width, height }));
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: height });
}
