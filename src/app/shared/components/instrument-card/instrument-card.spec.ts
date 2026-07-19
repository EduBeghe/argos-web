import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { instrumentCard } from '../../../features/dashboard/dashboard.fixture';
import {
  MarketInstrumentCard,
  ValuedPaperPosition,
} from '../../../features/dashboard/dashboard.models';
import { InstrumentCard } from './instrument-card';

const completeCard: MarketInstrumentCard = {
  ...instrumentCard,
  latest_score: {
    asset: 'TEST/USDT',
    provider: 'provider',
    market_type: 'spot',
    interval: '5m',
    candle_open_time: '2026-07-18T19:55:00Z',
    calculated_at: '2026-07-18T20:00:00Z',
    model_name: 'baseline_technical',
    model_version: 1,
    trend_score: '0.2',
    momentum_score: '0.1',
    volume_activity: '1.1',
    volatility_ratio: '0.01',
    directional_score: '0.3',
    volume_confirmation_factor: '1.2',
    overall_score: '0.401',
    signal_strength: '0.401',
    interpretation: 'bullish',
    contributions: { trend: '0.2', rsi: '0.05', return_1: '0.02', return_12: '0.03' },
    explanations: {
      trend: 'Price remains above both trend references.',
      momentum: 'Recent returns support positive momentum.',
      volume: 'Volume is above its recent baseline.',
      volatility: 'Recent volatility remains moderate.',
    },
  },
  latest_decision: {
    id: 'decision-id',
    asset: 'TEST/USDT',
    provider: 'provider',
    market_type: 'spot',
    interval: '5m',
    decision_timestamp: '2026-07-18T20:00:00Z',
    source_candle_open_time: '2026-07-18T19:55:00Z',
    source_market_price: '100',
    source_score_id: 'score-id',
    source_score_model_name: 'baseline_technical',
    source_score_model_version: 1,
    source_overall_score: '0.401',
    strategy_name: 'baseline_long_only',
    strategy_version: 1,
    configuration_version: 1,
    action: 'no_action',
    requested_target_portfolio_percentage: null,
    requested_position_percentage: null,
    applied_rule: 'open_position_retained',
    explanation: 'The existing position remains unchanged.',
    position_is_open: true,
  },
  open_position: {
    id: 'position-id',
    run_id: 'run-id',
    asset: 'TEST/USDT',
    provider: 'provider',
    market_type: 'spot',
    interval: '5m',
    status: 'open',
    quantity: '15',
    average_entry_price: '95',
    total_entry_notional: '1425',
    accumulated_entry_fees: '1.425',
    opened_at: '2026-07-18T18:30:00Z',
    closed_at: null,
    exit_price: null,
    gross_realized_pnl: null,
    net_realized_pnl: null,
  },
};

const valuedPosition: ValuedPaperPosition = {
  position_id: 'position-id',
  asset: 'TEST/USDT',
  provider: 'provider',
  market_type: 'spot',
  interval: '5m',
  quantity: '15',
  average_entry_price: '95',
  cost_basis: '1426.425',
  mark_price: '100.618666666666666667',
  market_value: '1509.28',
  unrealized_pnl: '82.855',
  unrealized_return: '0.058085',
  mark_candle_open_time: '2026-07-18T19:55:00Z',
};

describe('InstrumentCard', () => {
  async function render(card: MarketInstrumentCard = instrumentCard): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [InstrumentCard],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(InstrumentCard);
    fixture.componentRef.setInput('card', card);
    fixture.componentRef.setInput('valuedPosition', card.open_position ? valuedPosition : null);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('renders a compact generic instrument with nullable evidence', async () => {
    const element = await render();
    const summary = element.querySelector('.instrument-summary');

    expect(element.textContent).toContain('Test Instrument');
    expect(element.textContent).toContain('TEST/USDT');
    expect(summary?.textContent).toContain('No score');
    expect(summary?.textContent).toContain('No decision');
    expect(summary?.textContent).toContain('No open position');
    expect(element.querySelector('details')?.open).toBe(false);
    const detailLink = element.querySelector<HTMLAnchorElement>('.detail-link')!;
    expect(detailLink.getAttribute('href')).toContain('asset=TEST%2FUSDT');
    expect(detailLink.getAttribute('href')).toContain('provider=provider');
    expect(detailLink.getAttribute('href')).toContain('market_type=spot');
    expect(detailLink.getAttribute('href')).toContain('interval=5m');
  });

  it('renders fresh market evidence as up to date', async () => {
    const fresh = await render(instrumentCard);
    const freshStatus = fresh.querySelector('.status');
    expect(freshStatus?.textContent).toContain('Up to date');
    expect(freshStatus?.getAttribute('aria-label')).toBe('Market data up to date');
  });

  it('renders known non-fresh market evidence as stale', async () => {
    const stale = await render({
      ...instrumentCard,
      market_status: { ...instrumentCard.market_status!, is_fresh: false },
    });
    const staleStatus = stale.querySelector('.status');
    expect(staleStatus?.textContent).toContain('Stale');
    expect(staleStatus?.getAttribute('aria-label')).toBe('Market data stale');
  });

  it('renders absent market evidence as unavailable instead of stale', async () => {
    const unavailable = await render({ ...instrumentCard, market_status: null });
    const unavailableStatus = unavailable.querySelector('.status');
    expect(unavailableStatus?.textContent).toContain('Unavailable');
    expect(unavailableStatus?.textContent).not.toContain('Stale');
    expect(unavailableStatus?.getAttribute('aria-label')).toBe('Market data unavailable');
    expect(unavailableStatus?.classList.contains('unavailable')).toBe(true);
  });

  it('keeps score, decision, position, and exposure in the compact overview', async () => {
    const element = await render(completeCard);
    const summary = element.querySelector('.instrument-summary');

    expect(summary?.textContent).toContain('0.401');
    expect(summary?.textContent).toContain('Bullish');
    expect(summary?.textContent).toContain('No action');
    expect(summary?.textContent).toContain('Open');
    expect(summary?.textContent).toContain('1,509.28 USDT');
    expect(summary?.querySelector('app-metric-help[metric="overallScore"]')).not.toBeNull();
  });

  it('keeps technical, decision, and position evidence in a collapsed disclosure', async () => {
    const element = await render(completeCard);
    const details = element.querySelector('details')!;
    const compact = element.querySelector('.instrument-summary')!;

    expect(details.open).toBe(false);
    expect(details.getAttribute('class')).toContain('instrument-details');
    expect(details.querySelector('summary')?.getAttribute('aria-label')).toContain(
      'Test Instrument',
    );
    expect(details.textContent).toContain('Signal strength');
    expect(details.textContent).toContain('The existing position remains unchanged.');
    expect(details.textContent).toContain('Average entry price');
    expect(compact.textContent).not.toContain('Signal strength');
    expect(compact.textContent).not.toContain('The existing position remains unchanged.');

    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    expect(details.open).toBe(true);
  });

  it('uses wrapping-safe structures for arbitrary long metadata', async () => {
    const element = await render({
      ...instrumentCard,
      instrument: {
        ...instrumentCard.instrument,
        display_name: 'A very long provider-independent instrument display name',
        display_symbol: 'ARBITRARY-LONG-ASSET/ARBITRARY-LONG-QUOTE',
        provider: 'provider-with-a-long-public-display-name',
      },
    });

    expect(element.querySelector('.instrument-heading')).not.toBeNull();
    expect(element.querySelector('.identity')?.textContent).toContain(
      'provider-with-a-long-public-display-name',
    );
  });
});

@Component({
  imports: [InstrumentCard],
  template: `
    <app-instrument-card [card]="card" />
    <app-instrument-card [card]="card" />
  `,
})
class TwoInstrumentCardsHost {
  readonly card = completeCard;
}

describe('independent instrument disclosures', () => {
  it('opens one instrument without expanding another', async () => {
    await TestBed.configureTestingModule({
      imports: [TwoInstrumentCardsHost],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(TwoInstrumentCardsHost);
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelectorAll('details');

    expect(details[0].open).toBe(false);
    expect(details[1].open).toBe(false);
    details[0].open = true;
    details[0].dispatchEvent(new Event('toggle'));

    expect(details[0].open).toBe(true);
    expect(details[1].open).toBe(false);
  });
});
