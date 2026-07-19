import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  signal,
  WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';

import { MetricHelp } from '../../shared/components/metric-help/metric-help';
import {
  decimalValueTone,
  formatCurrency,
  formatDecimal,
  formatPercentage,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercentage,
} from '../../shared/formatting/decimal-format';
import {
  assetClassLabel,
  decisionActionLabel,
  interpretationLabel,
  marketTypeLabel,
  positionStatusLabel,
} from '../../shared/formatting/presentation-labels';
import { DashboardOverview, InstrumentDefinition } from '../dashboard/dashboard.models';
import { PriceHistoryChart } from './price-history-chart';
import { ScoreHistoryChart } from './score-history-chart';
import { HistoryRequest, InstrumentHistoryApiService } from './instrument-history-api.service';
import {
  CollectionState,
  DecisionSnapshot,
  HistoricalCollection,
  HistoryRange,
  InstrumentContext,
  InstrumentIdentity,
  MarketCandle,
  MarketScore,
  PaperTrade,
} from './instrument-detail.models';

const RANGES: Record<HistoryRange, number> = { '6h': 6, '24h': 24, '72h': 72 };

@Component({
  selector: 'app-instrument-detail-page',
  imports: [DatePipe, MetricHelp, PriceHistoryChart, RouterLink, ScoreHistoryChart],
  templateUrl: './instrument-detail-page.html',
  styleUrl: './instrument-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentDetailPage implements OnDestroy {
  private readonly api = inject(InstrumentHistoryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private requests = new Subscription();
  private generation = 0;

  readonly identity = signal<InstrumentIdentity | null>(null);
  readonly selectedRange = signal<HistoryRange>('24h');
  readonly window = signal(historyWindow('24h'));
  readonly invalidIdentity = signal<string | null>(null);
  readonly definition = signal<InstrumentDefinition | null>(null);
  readonly overview = signal<DashboardOverview | null>(null);
  readonly contextState = signal<CollectionState>('loading');
  readonly contextMessage = signal<string | null>(null);
  readonly overviewState = signal<CollectionState>('loading');
  readonly overviewMessage = signal<string | null>(null);
  readonly candles = signal(emptyCollection<MarketCandle>());
  readonly scores = signal(emptyCollection<MarketScore>());
  readonly decisions = signal(emptyCollection<DecisionSnapshot>());
  readonly trades = signal(emptyCollection<PaperTrade>());
  readonly compactCharts = signal(false);

  readonly context = computed<InstrumentContext | null>(() => {
    const definition = this.definition();
    if (!definition) return null;
    const overview = this.overview();
    const card =
      overview?.instruments.find((item) => sameIdentity(item.instrument, definition)) ?? null;
    const position =
      overview?.paper.portfolio?.positions.find((item) => sameIdentity(item, definition)) ?? null;
    return { definition, card, position };
  });

  readonly events = computed(() => {
    const decisions = this.decisions().data.map((value) => ({
      kind: 'decision' as const,
      timestamp: value.decision_timestamp,
      value,
    }));
    const trades = this.trades().data.map((value) => ({
      kind: 'trade' as const,
      timestamp: value.executed_at,
      value,
    }));
    return [...decisions, ...trades].sort(
      (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp),
    );
  });

  constructor() {
    this.updateChartDensity();
    this.route.queryParamMap.subscribe((params) => {
      const identity = parseIdentity({
        asset: params.get('asset'),
        provider: params.get('provider'),
        market_type: params.get('market_type'),
        interval: params.get('interval'),
      });
      const range = parseRange(params.get('range'));
      if (!identity || !range) {
        this.invalidIdentity.set(
          !identity
            ? 'A complete instrument identity is required.'
            : 'The selected history range is not supported.',
        );
        this.cancelRequests();
        return;
      }
      this.invalidIdentity.set(null);
      this.identity.set(identity);
      this.selectedRange.set(range);
      this.window.set(historyWindow(range));
      this.loadAll();
    });
  }

  ngOnDestroy(): void {
    this.cancelRequests();
  }

  @HostListener('window:resize')
  protected updateChartDensity(): void {
    this.compactCharts.set(window.innerWidth < 600);
  }

  protected formatRequestedPercentage(value: string | null): string {
    return value === null ? 'None' : formatPercentage(value);
  }

  selectRange(range: HistoryRange): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { range },
      queryParamsHandling: 'merge',
    });
  }

  retry(kind: 'candles' | 'scores' | 'decisions' | 'trades'): void {
    const request = this.request();
    if (!request) return;
    const generation = this.generation;
    if (kind === 'candles')
      this.refreshCollection(this.candles, this.api.getCandles(request), generation);
    if (kind === 'scores')
      this.refreshCollection(this.scores, this.api.getScores(request), generation);
    if (kind === 'decisions')
      this.refreshCollection(this.decisions, this.api.getDecisions(request), generation);
    if (kind === 'trades')
      this.refreshCollection(this.trades, this.api.getTrades(request), generation);
  }

  retryOverview(): void {
    this.loadOverview(this.generation);
  }

  protected hasTrade(decision: DecisionSnapshot): boolean {
    return this.trades().data.some((trade) => trade.decision_snapshot_id === decision.id);
  }

  protected formatMoney(value: string | null): string {
    return formatCurrency(value, this.context()?.definition.quote_currency ?? 'Quote currency');
  }

  protected readonly formatDecimal = formatDecimal;
  protected readonly formatQuantity = formatQuantity;
  protected readonly formatPercentage = formatPercentage;
  protected readonly formatSignedPercentage = formatSignedPercentage;
  protected readonly decimalValueTone = decimalValueTone;
  protected readonly assetClassLabel = assetClassLabel;
  protected readonly marketTypeLabel = marketTypeLabel;
  protected readonly decisionActionLabel = decisionActionLabel;
  protected readonly interpretationLabel = interpretationLabel;
  protected readonly positionStatusLabel = positionStatusLabel;
  protected readonly ranges = Object.keys(RANGES) as HistoryRange[];

  protected formatSignedMoney(value: string): string {
    return formatSignedCurrency(
      value,
      this.context()?.definition.quote_currency ?? 'Quote currency',
    );
  }

  private loadAll(): void {
    this.cancelRequests();
    const generation = ++this.generation;
    const identity = this.identity()!;
    this.contextState.set('loading');
    this.contextMessage.set(null);
    this.definition.set(null);
    this.overviewState.set('loading');
    this.overviewMessage.set(null);
    this.overview.set(null);
    this.candles.set(emptyCollection<MarketCandle>());
    this.scores.set(emptyCollection<MarketScore>());
    this.decisions.set(emptyCollection<DecisionSnapshot>());
    this.trades.set(emptyCollection<PaperTrade>());
    this.requests.add(
      this.api.getInstruments().subscribe({
        next: (instruments) => {
          if (generation !== this.generation) return;
          const definition = instruments.find((item) => sameIdentity(item, identity));
          if (!definition) {
            this.contextState.set('error');
            this.contextMessage.set('This instrument is not present in the Argos catalog.');
            return;
          }
          this.definition.set(definition);
          this.contextState.set('success');
          const request = this.request()!;
          this.loadCollection(this.candles, this.api.getCandles(request), generation);
          this.loadCollection(this.scores, this.api.getScores(request), generation);
          this.loadCollection(this.decisions, this.api.getDecisions(request), generation);
          this.loadCollection(this.trades, this.api.getTrades(request), generation);
        },
        error: () => {
          if (generation !== this.generation) return;
          this.contextState.set('error');
          this.contextMessage.set('Instrument context could not be loaded.');
        },
      }),
    );
    this.loadOverview(generation);
  }

  private loadOverview(generation: number): void {
    this.overviewState.set('loading');
    this.overviewMessage.set(null);
    this.requests.add(
      this.api.getOverview().subscribe({
        next: (overview) => {
          if (generation !== this.generation) return;
          this.overview.set(overview);
          this.overviewState.set('success');
        },
        error: () => {
          if (generation !== this.generation) return;
          this.overviewState.set('error');
          this.overviewMessage.set('Current dashboard context could not be loaded.');
        },
      }),
    );
  }

  private loadCollection<T>(
    target: WritableSignal<HistoricalCollection<T>>,
    source: Observable<T[]>,
    generation: number,
  ): void {
    target.set({ state: 'loading', data: [], message: null });
    this.requests.add(
      source.subscribe({
        next: (data) => {
          if (generation !== this.generation) return;
          target.set({ state: data.length ? 'success' : 'empty', data, message: null });
        },
        error: (error: HttpErrorResponse) => {
          if (generation !== this.generation) return;
          target.set({
            state: 'error',
            data: [],
            message:
              error.status === 404
                ? 'No active Paper run is available.'
                : 'This history could not be loaded.',
          });
        },
      }),
    );
  }

  private refreshCollection<T>(
    target: WritableSignal<HistoricalCollection<T>>,
    source: Observable<T[]>,
    generation: number,
  ): void {
    const previous = target();
    target.set({ ...previous, message: null });
    this.requests.add(
      source.subscribe({
        next: (data) => {
          if (generation !== this.generation) return;
          target.set({ state: data.length ? 'success' : 'empty', data, message: null });
        },
        error: () => {
          if (generation !== this.generation) return;
          target.set({
            ...previous,
            message: 'Refresh failed. Previously loaded history remains visible.',
          });
        },
      }),
    );
  }

  private request(): HistoryRequest | null {
    const identity = this.identity();
    if (!identity) return null;
    return { ...identity, ...this.window(), limit: 1000 };
  }

  private cancelRequests(): void {
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.generation++;
  }
}

export function historyWindow(range: HistoryRange, now = new Date()): { from: string; to: string } {
  const to = new Date(now);
  const from = new Date(to.getTime() - RANGES[range] * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function parseIdentity(
  value: Record<keyof InstrumentIdentity, string | null>,
): InstrumentIdentity | null {
  return value.asset && value.provider && value.market_type && value.interval
    ? {
        asset: value.asset,
        provider: value.provider,
        market_type: value.market_type,
        interval: value.interval,
      }
    : null;
}

function parseRange(value: string | null): HistoryRange | null {
  if (value === null) return '24h';
  return value in RANGES ? (value as HistoryRange) : null;
}

function sameIdentity(left: InstrumentIdentity, right: InstrumentIdentity): boolean {
  return (
    left.asset === right.asset &&
    left.provider === right.provider &&
    left.market_type === right.market_type &&
    left.interval === right.interval
  );
}

function emptyCollection<T>(): HistoricalCollection<T> {
  return { state: 'loading', data: [], message: null };
}
