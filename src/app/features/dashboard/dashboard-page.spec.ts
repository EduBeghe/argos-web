import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
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
        { provide: DashboardApiService, useValue: api },
        { provide: PaperHistoryApiService, useValue: historyApi },
      ],
    });
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
