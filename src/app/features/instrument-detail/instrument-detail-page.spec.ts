import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { DashboardOverview, InstrumentDefinition } from '../dashboard/dashboard.models';
import { InstrumentDetailPage, historyWindow, parseIdentity } from './instrument-detail-page';
import { InstrumentHistoryApiService } from './instrument-history-api.service';
import { DecisionSnapshot, MarketCandle } from './instrument-detail.models';

describe('InstrumentDetailPage', () => {
  const api = {
    getInstruments: vi.fn(),
    getOverview: vi.fn(),
    getCandles: vi.fn(),
    getScores: vi.fn(),
    getDecisions: vi.fn(),
    getTrades: vi.fn(),
  };

  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    api.getInstruments.mockReturnValue(of([definition]));
    api.getOverview.mockReturnValue(of(overview));
    api.getCandles.mockReturnValue(of([candle]));
    api.getScores.mockReturnValue(of([]));
    api.getDecisions.mockReturnValue(of([]));
    api.getTrades.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [InstrumentDetailPage],
      providers: [
        provideRouter([{ path: 'instruments/detail', component: InstrumentDetailPage }]),
        { provide: InstrumentHistoryApiService, useValue: api },
      ],
    });
  });

  it('rejects incomplete identity without loading or defaulting a provider', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/instruments/detail?asset=GENERIC%2FUSD&interval=15m');
    const fixture = TestBed.createComponent(InstrumentDetailPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'A complete instrument identity is required',
    );
    expect(api.getCandles).not.toHaveBeenCalled();
    expect(api.getInstruments).not.toHaveBeenCalled();
  });

  it('loads a generic identity independently and persists range selection in the URL', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(detailUrl('24h'));
    const fixture = TestBed.createComponent(InstrumentDetailPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Generic Instrument');
    expect(fixture.nativeElement.textContent).toContain('GENERIC/USD');
    expect(fixture.nativeElement.textContent).toContain('No open position');
    expect(api.getCandles.mock.calls[0][0]).toMatchObject({
      asset: 'GENERIC/USD',
      provider: 'generic-provider',
      market_type: 'cash',
      interval: '15m',
      limit: 1000,
    });

    const rangeButton = [...fixture.nativeElement.querySelectorAll('.range-bar button')].find(
      (button: HTMLButtonElement) => button.textContent.includes('6 hours'),
    ) as HTMLButtonElement;
    rangeButton.click();
    await fixture.whenStable();
    expect(router.url).toContain('range=6h');
  });

  it('keeps successful collections when one fails and retries only that collection', async () => {
    api.getScores
      .mockReturnValueOnce(throwError(() => ({ status: 503 })))
      .mockReturnValueOnce(of([]));
    const router = TestBed.inject(Router);
    await router.navigateByUrl(detailUrl('24h'));
    const fixture = TestBed.createComponent(InstrumentDetailPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This history could not be loaded');
    expect(fixture.nativeElement.querySelector('app-price-history-chart')).not.toBeNull();
    const retry = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent.includes('Retry Score'),
    ) as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    expect(api.getScores).toHaveBeenCalledTimes(2);
    expect(api.getCandles).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('app-score-history-chart')).not.toBeNull();
  });

  it('retains successful history when a retry fails', async () => {
    api.getCandles
      .mockReturnValueOnce(of([candle]))
      .mockReturnValueOnce(throwError(() => ({ status: 503 })));
    const router = TestBed.inject(Router);
    await router.navigateByUrl(detailUrl('24h'));
    const fixture = TestBed.createComponent(InstrumentDetailPage);
    fixture.detectChanges();

    fixture.componentInstance.retry('candles');
    fixture.detectChanges();

    expect(fixture.componentInstance.candles().data).toEqual([candle]);
    expect(fixture.nativeElement.querySelector('app-price-history-chart')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Refresh failed. Previously loaded history remains visible.',
    );
  });

  it('keeps successful histories visible when dashboard overview fails', async () => {
    api.getOverview.mockReturnValue(throwError(() => ({ status: 503 })));
    const router = TestBed.inject(Router);
    await router.navigateByUrl(detailUrl('24h'));
    const fixture = TestBed.createComponent(InstrumentDetailPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Generic Instrument');
    expect(fixture.nativeElement.querySelector('app-price-history-chart')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-score-history-chart')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Current position is unavailable because dashboard context could not be loaded.',
    );
    expect(fixture.nativeElement.textContent).toContain('Decision and trade history');
  });

  it('renders requested decimal fractions with the existing percentage formatter', async () => {
    api.getDecisions.mockReturnValue(
      of([
        {
          ...decision,
          requested_target_portfolio_percentage: '0.15',
        },
      ]),
    );
    const router = TestBed.inject(Router);
    await router.navigateByUrl(detailUrl('24h'));
    const fixture = TestBed.createComponent(InstrumentDetailPage);
    fixture.detectChanges();

    const requestedTarget = [...fixture.nativeElement.querySelectorAll('.decision-event dl div')]
      .find((item: HTMLElement) =>
        item.querySelector('dt')?.textContent.includes('Requested target'),
      )
      ?.querySelector('dd');
    expect(requestedTarget?.textContent.trim()).toBe('15.00%');
  });

  it('ignores a stale candle response after identity navigation', async () => {
    const oldResponse = new Subject<MarketCandle[]>();
    const newResponse = new Subject<MarketCandle[]>();
    api.getCandles
      .mockReturnValueOnce(oldResponse as Observable<MarketCandle[]>)
      .mockReturnValueOnce(newResponse as Observable<MarketCandle[]>);
    api.getInstruments.mockReturnValue(of([definition, { ...definition, asset: 'SECOND/USD' }]));
    const router = TestBed.inject(Router);
    await router.navigateByUrl(detailUrl('24h'));
    const fixture = TestBed.createComponent(InstrumentDetailPage);
    fixture.detectChanges();
    await router.navigateByUrl(detailUrl('24h').replace('GENERIC%2FUSD', 'SECOND%2FUSD'));
    fixture.detectChanges();

    oldResponse.next([{ ...candle, close_price: '1' }]);
    newResponse.next([{ ...candle, asset: 'SECOND/USD', close_price: '2' }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.candles().data[0].close_price).toBe('2');
  });
});

describe('instrument detail query helpers', () => {
  it('generates exact timezone-aware UTC windows', () => {
    expect(historyWindow('6h', new Date('2026-07-19T12:00:00-03:00'))).toEqual({
      from: '2026-07-19T09:00:00.000Z',
      to: '2026-07-19T15:00:00.000Z',
    });
  });

  it('requires every complete identity field', () => {
    expect(
      parseIdentity({ asset: 'A/B', provider: 'p', market_type: 'm', interval: '5m' }),
    ).not.toBeNull();
    expect(
      parseIdentity({ asset: 'A/B', provider: null, market_type: 'm', interval: '5m' }),
    ).toBeNull();
  });
});

const definition: InstrumentDefinition = {
  asset: 'GENERIC/USD',
  display_symbol: 'GEN/USD',
  display_name: 'Generic Instrument',
  asset_class: 'other',
  base_currency: 'GEN',
  quote_currency: 'USD',
  provider: 'generic-provider',
  provider_symbol: 'GENUSD',
  market_type: 'cash',
  interval: '15m',
  capabilities: { ingestion: true, scoring: true, decision: true, paper_trading: true },
  display_order: 1,
};
const overview: DashboardOverview = {
  generated_at: '2026-07-19T15:00:00Z',
  system: { market_data_fresh: true, instruments_total: 1, instruments_fresh: 1 },
  paper: { run: null, portfolio: null, performance: null },
  instruments: [
    {
      instrument: definition,
      market_status: {
        asset: 'GENERIC/USD',
        interval: '15m',
        candle_count: 1,
        latest_open_time: '2026-07-19T14:45:00Z',
        latest_close_time: '2026-07-19T14:59:59Z',
        latest_ingested_at: '2026-07-19T15:00:01Z',
        age_seconds: 1,
        is_fresh: true,
      },
      latest_score: null,
      latest_decision: null,
      open_position: null,
    },
  ],
};
const candle: MarketCandle = {
  id: 'candle',
  asset: 'GENERIC/USD',
  provider: 'generic-provider',
  market_type: 'cash',
  interval: '15m',
  open_time: '2026-07-19T14:45:00Z',
  close_time: '2026-07-19T14:59:59Z',
  open_price: '10',
  high_price: '11',
  low_price: '9',
  close_price: '10.5',
  base_asset_volume: '1',
  quote_asset_volume: '10.5',
  trade_count: 1,
  taker_buy_base_asset_volume: '0.5',
  taker_buy_quote_asset_volume: '5',
  ingested_at: '2026-07-19T15:00:01Z',
};
const decision: DecisionSnapshot = {
  id: 'decision',
  asset: 'GENERIC/USD',
  provider: 'generic-provider',
  market_type: 'cash',
  interval: '15m',
  decision_timestamp: '2026-07-19T15:00:00Z',
  source_candle_open_time: '2026-07-19T14:45:00Z',
  source_market_price: '10.5',
  source_score_id: 'score',
  source_score_model_name: 'baseline_technical',
  source_score_model_version: 1,
  source_overall_score: '0.5',
  strategy_name: 'baseline_long_only',
  strategy_version: 1,
  configuration_version: 1,
  action: 'open_position',
  requested_target_portfolio_percentage: '0.15',
  requested_position_percentage: null,
  applied_rule: 'entry_threshold_met',
  explanation: 'The entry threshold was met.',
  position_is_open: false,
};

function detailUrl(range: string): string {
  return `/instruments/detail?asset=GENERIC%2FUSD&provider=generic-provider&market_type=cash&interval=15m&range=${range}`;
}
