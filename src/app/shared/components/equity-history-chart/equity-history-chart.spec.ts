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
    expect(normalizedText(fixture)).toContain('Change from start No data');
    expect(normalizedText(fixture)).toContain('Persisted return No data');
  });

  it('renders one persisted snapshot without including current portfolio equity', async () => {
    const fixture = await render([paperSnapshot]);

    expect(
      fixture.nativeElement.querySelector('polyline').getAttribute('points').split(' '),
    ).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('10,100.00 USDT');
    expect(fixture.nativeElement.textContent).not.toContain('10,200.00 USDT');
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

    expect(normalizedText(fixture)).toContain('Latest persisted equity 10,400.00 USDT');
    expect(normalizedText(fixture)).toContain('Change from start +400.00 USDT');
    expect(normalizedText(fixture)).toContain('Persisted return +4.00%');
    expect(normalizedText(fixture)).toContain('Snapshots shown 2');
  });

  it('draws a complete short history from the run start', async () => {
    const fixture = await render([paperSnapshot]);
    const points = fixture.nativeElement
      .querySelector('polyline')
      .getAttribute('points')
      .split(' ');

    expect(points).toHaveLength(2);
    expect(normalizedText(fixture)).toContain('First point 10,000.00 USDT');
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
    expect(normalizedText(fixture)).toContain('Snapshots shown 500');
    expect(normalizedText(fixture)).toContain('First point 10,001.00 USDT');
    expect(normalizedText(fixture)).not.toContain('First point 10,000.00 USDT');
    const baseline = fixture.nativeElement.querySelector('.baseline');
    expect(baseline.getAttribute('y1')).not.toContain('NaN');
    expect(baseline.getAttribute('y1')).not.toContain('Infinity');
  });

  it('provides an accessible SVG and a visible textual point summary', async () => {
    const fixture = await render([paperSnapshot]);
    const svg = fixture.nativeElement.querySelector('svg');

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.querySelector('title')?.textContent).toContain('equity history');
    expect(svg.querySelector('desc')?.textContent).toContain('dashed horizontal line');
    expect(fixture.nativeElement.textContent).toContain('First point');
    expect(fixture.nativeElement.textContent).toContain('Last point');
  });
});

function parsePoints(value: string): number[][] {
  return value.split(' ').map((point) => point.split(',').map(Number));
}

function normalizedText(fixture: ComponentFixture<EquityHistoryChart>): string {
  return fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
}
