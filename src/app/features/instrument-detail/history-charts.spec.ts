import { TestBed } from '@angular/core/testing';

import {
  DecisionSnapshot,
  MarketCandle,
  MarketScore,
  PaperTrade,
} from './instrument-detail.models';
import { PriceHistoryChart } from './price-history-chart';
import { ScoreHistoryChart } from './score-history-chart';

const from = '2026-07-18T00:00:00.000Z';
const to = '2026-07-19T00:00:00.000Z';
const candles: MarketCandle[] = [candle('10000', from), candle('10012', to)];
const noAction: DecisionSnapshot = {
  id: 'decision',
  asset: 'GENERIC/USD',
  provider: 'provider',
  market_type: 'cash',
  interval: '15m',
  decision_timestamp: to,
  source_candle_open_time: to,
  source_market_price: '10012',
  source_score_id: 'score',
  source_score_model_name: 'model',
  source_score_model_version: 1,
  source_overall_score: '0.2',
  strategy_name: 'strategy',
  strategy_version: 1,
  configuration_version: 1,
  action: 'no_action',
  requested_target_portfolio_percentage: null,
  requested_position_percentage: null,
  applied_rule: 'retain',
  explanation: 'No change.',
  position_is_open: false,
};
const trade: PaperTrade = {
  id: 'trade',
  run_id: 'run',
  decision_snapshot_id: 'decision',
  position_id: 'position',
  side: 'buy',
  asset: 'GENERIC/USD',
  provider: 'provider',
  market_type: 'cash',
  interval: '15m',
  observed_market_price: '10012',
  slippage_rate: '0.0005',
  execution_price: '10017',
  quantity: '1',
  executed_notional: '10017',
  fee_rate: '0.001',
  fee_amount: '10.017',
  cash_impact: '-10027.017',
  executed_at: to,
  configuration_version: 1,
  equity_before: '20000',
};

describe('PriceHistoryChart', () => {
  it('uses a non-zero contextual scale and distinct Decision and Trade markers', async () => {
    const fixture = await renderPrice(candles, [noAction], [trade]);
    const component = fixture.componentInstance as unknown as {
      geometry: () => { domainMin: number; domainMax: number; points: { y: number }[] };
    };
    const geometry = component.geometry();

    expect(geometry.domainMin).toBeGreaterThan(9000);
    expect(geometry.domainMin).toBeLessThanOrEqual(10000);
    expect(geometry.domainMax).toBeGreaterThanOrEqual(10012);
    expect(Math.abs(geometry.points[1].y - geometry.points[0].y)).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('.decision-marker')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.trade-marker')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('svg title')?.textContent).toContain(
      'price history',
    );
  });

  it('does not fabricate a Trade marker for a NO_ACTION Decision', async () => {
    const fixture = await renderPrice(candles, [noAction], []);

    expect(fixture.nativeElement.querySelectorAll('.decision-marker')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.trade-marker')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Latest: 10,012.00 USD');
  });

  it('keeps one point and empty history readable', async () => {
    const one = await renderPrice([candles[0]], [], []);
    expect(one.nativeElement.querySelector('polyline').getAttribute('points')).not.toContain('NaN');
    TestBed.resetTestingModule();
    const empty = await renderPrice([], [], []);
    expect(empty.nativeElement.textContent).toContain('No persisted candles');
  });
});

describe('ScoreHistoryChart', () => {
  it('uses the fixed -1 to +1 domain and reduces UTC ticks when compact', async () => {
    await TestBed.configureTestingModule({ imports: [ScoreHistoryChart] }).compileComponents();
    const fixture = TestBed.createComponent(ScoreHistoryChart);
    fixture.componentRef.setInput('scores', [score('-1', from), score('1', to)]);
    fixture.componentRef.setInput('decisions', [noAction]);
    fixture.componentRef.setInput('from', from);
    fixture.componentRef.setInput('to', to);
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    expect(
      [...fixture.nativeElement.querySelectorAll('.axis.y')].map((item) => item.textContent.trim()),
    ).toEqual(['1', '0.5', '0', '-0.5', '-1']);
    expect(fixture.nativeElement.querySelectorAll('.axis.x')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.zero-line')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('not a probability of profit');
  });
});

async function renderPrice(
  candleValues: MarketCandle[],
  decisions: DecisionSnapshot[],
  trades: PaperTrade[],
) {
  await TestBed.configureTestingModule({ imports: [PriceHistoryChart] }).compileComponents();
  const fixture = TestBed.createComponent(PriceHistoryChart);
  fixture.componentRef.setInput('candles', candleValues);
  fixture.componentRef.setInput('decisions', decisions);
  fixture.componentRef.setInput('trades', trades);
  fixture.componentRef.setInput('from', from);
  fixture.componentRef.setInput('to', to);
  fixture.componentRef.setInput('quoteCurrency', 'USD');
  fixture.detectChanges();
  return fixture;
}

function candle(close: string, timestamp: string): MarketCandle {
  return {
    id: timestamp,
    asset: 'GENERIC/USD',
    provider: 'provider',
    market_type: 'cash',
    interval: '15m',
    open_time: timestamp,
    close_time: timestamp,
    open_price: close,
    high_price: close,
    low_price: close,
    close_price: close,
    base_asset_volume: '1',
    quote_asset_volume: close,
    trade_count: 1,
    taker_buy_base_asset_volume: '0.5',
    taker_buy_quote_asset_volume: '0.5',
    ingested_at: timestamp,
  };
}

function score(value: string, timestamp: string): MarketScore {
  return {
    asset: 'GENERIC/USD',
    provider: 'provider',
    market_type: 'cash',
    interval: '15m',
    candle_open_time: timestamp,
    calculated_at: timestamp,
    model_name: 'model',
    model_version: 1,
    trend_score: value,
    momentum_score: value,
    volume_activity: '0.5',
    volatility_ratio: '0.01',
    directional_score: value,
    volume_confirmation_factor: '1',
    overall_score: value,
    signal_strength: value.startsWith('-') ? value.slice(1) : value,
    interpretation: 'neutral',
    contributions: { trend: value, rsi: '0', return_1: '0', return_12: '0' },
    explanations: { trend: 't', momentum: 'm', volume: 'v', volatility: 'v' },
  };
}
