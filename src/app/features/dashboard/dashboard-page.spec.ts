import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { DashboardApiService } from './dashboard-api.service';
import { dashboardOverview, dashboardWithPaper, paperSnapshot } from './dashboard.fixture';
import { DashboardOverview, PaperPortfolioSnapshot } from './dashboard.models';
import { DashboardPage } from './dashboard-page';
import { PaperHistoryApiService } from '../paper-history/paper-history-api.service';

describe('DashboardPage', () => {
  const api = {
    getOverview: vi.fn<() => Observable<DashboardOverview>>(),
  };
  const historyApi = {
    getEquitySnapshots: vi.fn<(runId: string) => Observable<PaperPortfolioSnapshot[]>>(),
  };

  beforeEach(() => {
    api.getOverview.mockReset();
    historyApi.getEquitySnapshots.mockReset();
    historyApi.getEquitySnapshots.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([{ path: 'evaluation', component: DashboardPage }]),
        { provide: DashboardApiService, useValue: api },
        { provide: PaperHistoryApiService, useValue: historyApi },
      ],
    });
  });

  it('navigates to the dedicated Strategy evaluation route', async () => {
    api.getOverview.mockReturnValue(of(dashboardWithPaper));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('a[routerLink="/evaluation"]') as HTMLAnchorElement
    ).click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/evaluation');
  });

  it('presents research and evaluation routes as keyboard-focusable navigation buttons', () => {
    api.getOverview.mockReturnValue(of(dashboardWithPaper));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const links = [
      ...fixture.nativeElement.querySelectorAll('a.secondary-action'),
    ] as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('routerLink'))).toEqual([
      '/strategies',
      '/ml-refinement',
      '/paper-strategies',
      '/evaluation',
    ]);
    expect(links.every((link) => link.tabIndex === 0)).toBe(true);
  });

  it('shows initial loading and then a data-driven instrument with no active run', () => {
    const response = new Subject<DashboardOverview>();
    api.getOverview.mockReturnValue(response);
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading Argos overview');

    response.next(dashboardOverview);
    response.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No active run');
    expect(fixture.nativeElement.textContent).toContain('Test Instrument');
    expect(api.getOverview).toHaveBeenCalledTimes(1);
    expect(historyApi.getEquitySnapshots).not.toHaveBeenCalled();
  });

  it('uses a compact healthy system presentation with API-derived counts', () => {
    api.getOverview.mockReturnValue(of(dashboardOverview));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const status = fixture.nativeElement.querySelector('.system-status-healthy');

    expect(status.querySelector('strong').textContent).toBe('Market data up to date');
    expect(status.textContent).toContain('1 of 1 instrument fresh');
    expect(status.getAttribute('aria-label')).toBe('Market data status: up to date');
    expect(fixture.nativeElement.querySelector('.system-status-warning')).toBeNull();
  });

  it('keeps stale system evidence prominent with a retry control', () => {
    api.getOverview.mockReturnValue(
      of({
        ...dashboardOverview,
        system: { market_data_fresh: false, instruments_total: 2, instruments_fresh: 1 },
      }),
    );
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const warning = fixture.nativeElement.querySelector('.system-status-warning');

    expect(warning).not.toBeNull();
    expect(warning.closest('details')).toBeNull();
    expect(warning.textContent).toContain('Market data needs attention');
    expect(warning.textContent).toContain('1 of 2 instruments fresh');
    expect(warning.querySelector('button').textContent).toContain('Retry refresh');
  });

  it('shows an initial HTTP error', () => {
    api.getOverview.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The dashboard could not be loaded');
  });

  it('renders the complete Paper Trading summary without recalculating values', () => {
    api.getOverview.mockReturnValue(of(dashboardWithPaper));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('10,200.00 USDT');
    expect(fixture.nativeElement.textContent).toContain('+2.00%');
    expect(fixture.nativeElement.textContent).toContain('It may precede');
    expect(fixture.nativeElement.querySelector('.value-positive')?.textContent).toContain(
      '+200.00 USDT',
    );
    expect(historyApi.getEquitySnapshots).toHaveBeenCalledOnce();
    expect(historyApi.getEquitySnapshots).toHaveBeenCalledWith('run-id');
  });

  it('keeps exactly four primary Paper metrics visible and secondary evidence collapsed', () => {
    api.getOverview.mockReturnValue(of(dashboardWithPaper));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const primaryMetrics = [...fixture.nativeElement.querySelectorAll('.primary-metric')];
    const primaryText = primaryMetrics.map((metric) => metric.textContent.replace(/\s+/g, ' '));
    const runDetails = fixture.nativeElement.querySelector('.run-details');

    expect(primaryMetrics).toHaveLength(4);
    expect(primaryText.some((text) => text.includes('Current equity'))).toBe(true);
    expect(primaryText.some((text) => text.includes('Total P&L'))).toBe(true);
    expect(primaryText.some((text) => text.includes('Total return'))).toBe(true);
    expect(primaryText.some((text) => text.includes('Maximum drawdown'))).toBe(true);
    expect(runDetails.open).toBe(false);
    expect(runDetails.querySelector('.run-detail-grid').textContent).toContain('Available cash');
    expect(runDetails.querySelector('.run-detail-grid').textContent).toContain(
      'Configuration version',
    );
    expect(primaryMetrics[0].querySelector('app-metric-help[metric="equity"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent.match(/10,200\.00 USDT/g)).toHaveLength(1);
  });

  it('opens Run details to expose traceable configuration and account values', () => {
    api.getOverview.mockReturnValue(of(dashboardWithPaper));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const runDetails = fixture.nativeElement.querySelector('.run-details');

    runDetails.open = true;
    runDetails.dispatchEvent(new Event('toggle'));
    fixture.detectChanges();

    expect(runDetails.open).toBe(true);
    expect(runDetails.textContent).toContain('9,000.00 USDT');
    expect(runDetails.textContent).toContain('USDT');
    expect(runDetails.textContent).toContain('0.10%');
    expect(runDetails.textContent).toContain('0.05%');
    expect(runDetails.querySelector('app-metric-help[metric="feeRate"]')).not.toBeNull();
    expect(runDetails.querySelector('app-metric-help[metric="slippageRate"]')).not.toBeNull();
    expect(runDetails.querySelector('app-metric-help[metric="fees"]')).toBeNull();
    expect(runDetails.querySelector('app-metric-help[metric="slippage"]')).toBeNull();
  });

  it('places Equity history before compact instruments in document order', () => {
    api.getOverview.mockReturnValue(of(dashboardWithPaper));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const history = fixture.nativeElement.querySelector('#equity-history-title').closest('section');
    const instruments = fixture.nativeElement
      .querySelector('#instruments-title')
      .closest('section');

    expect(
      history.compareDocumentPosition(instruments) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  it('keeps authoritative financial formatting unchanged when contextual help opens', () => {
    api.getOverview.mockReturnValue(of(dashboardWithPaper));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const equityValue = fixture.nativeElement.querySelector('.hero-metric strong');
    const valueBeforeHelp = equityValue.textContent.trim();
    const helpTrigger = fixture.nativeElement.querySelector('.hero-metric app-metric-help button');

    helpTrigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();
    expect(equityValue.textContent.trim()).toBe(valueBeforeHelp);
    expect(valueBeforeHelp).toBe('10,200.00 USDT');
  });

  it('replaces history when the active run changes and ignores the old response', () => {
    const runAHistory = new Subject<PaperPortfolioSnapshot[]>();
    const runBHistory = new Subject<PaperPortfolioSnapshot[]>();
    const runBOverview: DashboardOverview = {
      ...dashboardWithPaper,
      paper: {
        ...dashboardWithPaper.paper,
        run: { ...dashboardWithPaper.paper.run!, id: 'run-b' },
      },
    };
    api.getOverview
      .mockReturnValueOnce(of(dashboardWithPaper))
      .mockReturnValueOnce(of(runBOverview));
    historyApi.getEquitySnapshots.mockReturnValueOnce(runAHistory).mockReturnValueOnce(runBHistory);
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    fixture.componentInstance.refresh();
    runBHistory.next([{ ...paperSnapshot, id: 'snapshot-b', run_id: 'run-b', equity: '10200' }]);
    runAHistory.next([{ ...paperSnapshot, equity: '99999' }]);

    expect(fixture.componentInstance.historyRunId()).toBe('run-b');
    expect(fixture.componentInstance.equitySnapshots()).toEqual([
      { ...paperSnapshot, id: 'snapshot-b', run_id: 'run-b', equity: '10200' },
    ]);
  });

  it('keeps the overview available when equity history fails', () => {
    api.getOverview.mockReturnValue(of(dashboardWithPaper));
    historyApi.getEquitySnapshots.mockReturnValue(throwError(() => new Error('history failed')));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Current equity');
    expect(fixture.nativeElement.textContent).toContain('Equity history could not be loaded');
    expect(fixture.nativeElement.textContent).toContain('Retry history');
  });

  it('preserves loaded history when an overview refresh fails', () => {
    api.getOverview.mockReturnValueOnce(of(dashboardWithPaper));
    historyApi.getEquitySnapshots.mockReturnValue(of([paperSnapshot]));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    api.getOverview.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));

    fixture.componentInstance.refresh();
    fixture.detectChanges();

    expect(fixture.componentInstance.equitySnapshots()).toEqual([paperSnapshot]);
    expect(fixture.nativeElement.textContent).toContain('10,100.00 USDT');
    expect(fixture.nativeElement.textContent).toContain('The dashboard could not be loaded');
  });

  it('preserves loaded history and warns when its refresh fails', () => {
    api.getOverview
      .mockReturnValueOnce(of(dashboardWithPaper))
      .mockReturnValueOnce(of(dashboardWithPaper));
    historyApi.getEquitySnapshots
      .mockReturnValueOnce(of([paperSnapshot]))
      .mockReturnValueOnce(throwError(() => new Error('history refresh failed')));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    fixture.componentInstance.refresh();
    fixture.detectChanges();

    expect(fixture.componentInstance.equitySnapshots()).toEqual([paperSnapshot]);
    expect(fixture.nativeElement.textContent).toContain('10,100.00 USDT');
    expect(fixture.nativeElement.textContent).toContain('Equity history could not be loaded');
  });

  it('shows the run while reporting an unavailable current valuation', () => {
    api.getOverview.mockReturnValue(
      of({
        ...dashboardWithPaper,
        paper: { ...dashboardWithPaper.paper, portfolio: null },
      }),
    );
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Active run');
    expect(fixture.nativeElement.textContent).toContain('Current valuation unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('No active run');
  });

  it('shows the run while reporting unavailable historical metrics', () => {
    api.getOverview.mockReturnValue(
      of({
        ...dashboardWithPaper,
        paper: { ...dashboardWithPaper.paper, performance: null },
      }),
    );
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Active run');
    expect(fixture.nativeElement.textContent).toContain('Historical metrics are not available yet');
    expect(fixture.nativeElement.textContent).not.toContain('No active run');
  });

  it('keeps previous data when a refresh fails and maps 409 safely', () => {
    api.getOverview.mockReturnValueOnce(of(dashboardOverview));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    api.getOverview.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409 })));

    fixture.componentInstance.refresh();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Test Instrument');
    expect(fixture.nativeElement.textContent).toContain('The portfolio could not be valued');
    expect(api.getOverview).toHaveBeenCalledTimes(2);
  });
});
