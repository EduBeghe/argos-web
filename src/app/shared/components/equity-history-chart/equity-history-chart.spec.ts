import { ComponentFixture, TestBed } from '@angular/core/testing';

import { dashboardWithPaper, paperSnapshot } from '../../../features/dashboard/dashboard.fixture';
import { PaperPortfolioSnapshot, PaperRun } from '../../../features/dashboard/dashboard.models';
import { EquityHistoryChart } from './equity-history-chart';

describe('EquityHistoryChart', () => {
  const run = dashboardWithPaper.paper.run as PaperRun;

  async function render(
    snapshots: PaperPortfolioSnapshot[],
    selectedRun: PaperRun = run,
  ): Promise<ComponentFixture<EquityHistoryChart>> {
    await TestBed.configureTestingModule({ imports: [EquityHistoryChart] }).compileComponents();
    const fixture = TestBed.createComponent(EquityHistoryChart);
    fixture.componentRef.setInput('run', selectedRun);
    fixture.componentRef.setInput('snapshots', snapshots);
    fixture.detectChanges();
    return fixture;
  }

  it('shows only the initial point while waiting for the first snapshot', async () => {
    const fixture = await render([], run);

    expect(fixture.nativeElement.textContent).toContain(
      'Waiting for the first persisted equity snapshot',
    );
    expect(fixture.nativeElement.querySelectorAll('circle')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('10,000.00 USDT');
    expect(summaryText(fixture, 1)).toBe('Change from startNo data');
    expect(summaryText(fixture, 2)).toBe('Persisted returnNo data');
  });

  it('renders one persisted snapshot without including current portfolio equity', async () => {
    const fixture = await render([paperSnapshot]);

    expect(
      fixture.nativeElement.querySelector('polyline').getAttribute('points').split(' '),
    ).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('10,100.00 USDT');
    expect(fixture.nativeElement.textContent).not.toContain('10,200.00 USDT');
    expect(fixture.nativeElement.querySelector('.latest-label')?.textContent).toContain(
      '10,100.00 USDT',
    );
  });

  it('renders contextual USDT Y-axis ticks without forcing a narrow series to zero', async () => {
    const fixture = await render([
      paperSnapshot,
      {
        ...paperSnapshot,
        id: 'narrow-latest',
        scheduled_boundary: '2026-07-18T19:00:00Z',
        equity: '10020',
      },
    ]);
    const labels = [...fixture.nativeElement.querySelectorAll('.y-label')].map((element) =>
      element.textContent.trim(),
    );

    expect(labels).toHaveLength(5);
    expect(labels.every((label) => label.endsWith('USDT'))).toBe(true);
    expect(labels.every((label) => Number(label.replace(/[^0-9.-]/g, '')) > 9000)).toBe(true);
  });

  it('gives a realistic 10,000 to 10,012 USDT movement meaningful plot height', async () => {
    const fixture = await render([{ ...paperSnapshot, equity: '10012' }]);
    const [domainMin, domainMax] = chartDomain(fixture);
    const points = chartCoordinates(fixture);

    expectDomainContains(domainMin, domainMax, [10000, 10012]);
    const plottedHeight = Math.abs(points[1][1] - points[0][1]);
    const plotHeight = 222;
    expect(plottedHeight / plotHeight).toBeGreaterThanOrEqual(0.1);
  });

  it.each([
    { name: 'ascending', equities: ['10000', '10012', '10025'] },
    { name: 'descending', equities: ['10000', '9988', '9975'] },
    { name: 'both sides of initial equity', equities: ['10000', '9988', '10012'] },
  ])('contains initial equity and every plotted value for $name history', async ({ equities }) => {
    const snapshots = equities.slice(1).map((equity, index) => ({
      ...paperSnapshot,
      id: `domain-${index}`,
      scheduled_boundary: new Date(
        Date.parse('2026-07-18T18:30:00Z') + index * 30 * 60 * 1000,
      ).toISOString(),
      equity,
    }));
    const fixture = await render(snapshots);
    const [domainMin, domainMax] = chartDomain(fixture);

    expectDomainContains(domainMin, domainMax, equities.map(Number));
  });

  it('lets a larger real movement control the contextual domain', async () => {
    const fixture = await render([
      { ...paperSnapshot, equity: '9000' },
      {
        ...paperSnapshot,
        id: 'large-movement',
        scheduled_boundary: '2026-07-18T19:00:00Z',
        equity: '11000',
      },
    ]);
    const [domainMin, domainMax] = chartDomain(fixture);

    expectDomainContains(domainMin, domainMax, [9000, 10000, 11000]);
    expect(2000 / (domainMax - domainMin)).toBeGreaterThanOrEqual(0.5);
  });

  it('renders UTC X-axis references from actual point timestamps', async () => {
    const fixture = await render([paperSnapshot]);
    const labels = [...fixture.nativeElement.querySelectorAll('.x-label')].map((element) =>
      element.textContent.replace(/\s+/g, ' ').trim(),
    );

    expect(labels).toContain('18:00 UTC');
    expect(labels).toContain('18:30 UTC');
  });

  it('labels the patterned initial-equity reference visibly', async () => {
    const fixture = await render([paperSnapshot]);

    expect(fixture.nativeElement.querySelector('.baseline-label')?.textContent).toContain(
      'Initial equity · 10,000.00 USDT',
    );
    expect(
      fixture.nativeElement.querySelector('.baseline').getAttribute('stroke-dasharray'),
    ).not.toBe('');
  });

  it('sorts multiple snapshots and deduplicates stable boundaries', async () => {
    const later = {
      ...paperSnapshot,
      id: 'later',
      scheduled_boundary: '2026-07-18T19:00:00Z',
      equity: '10300',
    };
    const duplicate = { ...paperSnapshot, id: 'replacement', equity: '10150' };
    const fixture = await render([later, paperSnapshot, duplicate], run);

    expect(
      fixture.nativeElement.querySelector('polyline').getAttribute('points').split(' '),
    ).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('10,300.00 USDT');
  });

  it('avoids invalid coordinates when every equity value is equal', async () => {
    const fixture = await render([{ ...paperSnapshot, equity: run.initial_cash }]);
    const points = fixture.nativeElement.querySelector('polyline').getAttribute('points');

    expect(points).not.toContain('NaN');
    expect(points).not.toContain('Infinity');
    expect(fixture.nativeElement.querySelectorAll('.y-label')).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('.y-label')[0].textContent).toContain('USDT');
  });

  it('positions ascending and descending series in the expected visual direction', async () => {
    const ascending = await render([{ ...paperSnapshot, equity: '11000' }]);
    const ascendingPoints = parsePoints(
      ascending.nativeElement.querySelector('polyline').getAttribute('points'),
    );
    expect(ascendingPoints[1][1]).toBeLessThan(ascendingPoints[0][1]);

    TestBed.resetTestingModule();
    const descending = await render([{ ...paperSnapshot, equity: '9000' }]);
    const descendingPoints = parsePoints(
      descending.nativeElement.querySelector('polyline').getAttribute('points'),
    );
    expect(descendingPoints[1][1]).toBeGreaterThan(descendingPoints[0][1]);
  });

  it('supports scientific Decimal zero for visual coordinates', async () => {
    const scientificRun = { ...run, initial_cash: '0E-18' };
    const fixture = await render(
      [{ ...paperSnapshot, initial_cash: '0E-18', equity: '0E-18' }],
      scientificRun,
    );

    expect(fixture.nativeElement.querySelector('polyline').getAttribute('points')).not.toContain(
      'NaN',
    );
    expect(fixture.nativeElement.textContent).toContain('0.00 USDT');
  });

  it('uses the latest ordered snapshot for aligned equity, P&L, and return', async () => {
    const latest = {
      ...paperSnapshot,
      id: 'latest',
      scheduled_boundary: '2026-07-18T19:00:00Z',
      equity: '10400',
      total_pnl: '400',
      total_return: '0.04',
    };
    const fixture = await render([latest, paperSnapshot]);

    expect(summaryText(fixture, 0)).toBe('Latest persisted equity10,400.00 USDT');
    expect(summaryText(fixture, 1)).toBe('Change from start +400.00 USDT');
    expect(summaryText(fixture, 2)).toBe('Persisted return +4.00%');
    expect(summaryText(fixture, 3)).toBe('Snapshots shown2');
  });

  it('draws a complete short history from the run start', async () => {
    const fixture = await render([paperSnapshot]);
    const points = fixture.nativeElement
      .querySelector('polyline')
      .getAttribute('points')
      .split(' ');

    expect(points).toHaveLength(2);
    expect(pointSummaryText(fixture, 0)).toContain('First point10,000.00 USDT');
  });

  it('draws exactly the latest 500 snapshots without connecting omitted history', async () => {
    const snapshots = Array.from({ length: 500 }, (_, index) => ({
      ...paperSnapshot,
      id: `snapshot-${index}`,
      scheduled_boundary: new Date(
        Date.parse('2026-01-01T00:00:00Z') + index * 30 * 60 * 1000,
      ).toISOString(),
      equity: String(10001 + index),
    })).reverse();
    const fixture = await render(snapshots);
    const points = fixture.nativeElement
      .querySelector('polyline')
      .getAttribute('points')
      .split(' ');

    expect(points).toHaveLength(500);
    expect(fixture.nativeElement.textContent).toContain(
      'Showing the latest 500 persisted snapshots.',
    );
    expect(summaryText(fixture, 3)).toBe('Snapshots shown500');
    expect(pointSummaryText(fixture, 0)).toContain('First point10,001.00 USDT');
    expect(pointSummaryText(fixture, 0)).not.toContain('First point10,000.00 USDT');
    const baseline = fixture.nativeElement.querySelector('.baseline');
    expect(baseline.getAttribute('y1')).not.toContain('NaN');
    expect(baseline.getAttribute('y1')).not.toContain('Infinity');
    expect(fixture.nativeElement.querySelectorAll('.x-tick')).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('.x-tick.intermediate')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('.x-tick:not(.intermediate)')).toHaveLength(2);
  });

  it('provides an accessible SVG and a visible textual point summary', async () => {
    const fixture = await render([paperSnapshot]);
    const svg = fixture.nativeElement.querySelector('svg');

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.querySelector('title')?.textContent).toContain('equity history');
    expect(svg.querySelector('desc')?.textContent).toContain('dashed horizontal line');
    expect(svg.querySelector('desc')?.textContent).toContain('USDT and UTC axes');
    expect(fixture.nativeElement.textContent).toContain('First point');
    expect(fixture.nativeElement.textContent).toContain('Last point');
  });
});

function parsePoints(value: string): number[][] {
  return value.split(' ').map((point) => point.split(',').map(Number));
}

function chartCoordinates(fixture: ComponentFixture<EquityHistoryChart>): number[][] {
  return parsePoints(fixture.nativeElement.querySelector('polyline').getAttribute('points'));
}

function chartDomain(fixture: ComponentFixture<EquityHistoryChart>): [number, number] {
  const component = fixture.componentInstance as unknown as {
    domainMin: () => number;
    domainMax: () => number;
  };
  return [component.domainMin(), component.domainMax()];
}

function expectDomainContains(domainMin: number, domainMax: number, values: number[]): void {
  for (const value of values) {
    expect(value).toBeGreaterThanOrEqual(domainMin);
    expect(value).toBeLessThanOrEqual(domainMax);
  }
}

function summaryText(fixture: ComponentFixture<EquityHistoryChart>, index: number): string {
  return fixture.nativeElement.querySelectorAll('.chart-summary > div')[index].textContent.trim();
}

function pointSummaryText(fixture: ComponentFixture<EquityHistoryChart>, index: number): string {
  return fixture.nativeElement.querySelectorAll('.point-summary > p')[index].textContent.trim();
}
