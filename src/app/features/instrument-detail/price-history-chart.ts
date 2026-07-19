import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatCurrency } from '../../shared/formatting/decimal-format';
import { DecisionSnapshot, MarketCandle, PaperTrade } from './instrument-detail.models';
import { CHART, ChartTick, contextualDomain, timeX, utcTicks, yPosition } from './chart-geometry';

@Component({
  selector: 'app-price-history-chart',
  templateUrl: './price-history-chart.html',
  styleUrl: './history-charts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceHistoryChart {
  readonly candles = input.required<MarketCandle[]>();
  readonly decisions = input.required<DecisionSnapshot[]>();
  readonly trades = input.required<PaperTrade[]>();
  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly quoteCurrency = input.required<string>();
  readonly compact = input(false);

  protected readonly geometry = computed(() => {
    const candles = [...this.candles()].sort(
      (a, b) => Date.parse(a.open_time) - Date.parse(b.open_time),
    );
    const values = candles.map((candle) => Number(candle.close_price));
    const [domainMin, domainMax] = contextualDomain(values.length ? values : [0]);
    const points = candles.map((candle) => ({
      x: timeX(candle.open_time, this.from(), this.to()),
      y: yPosition(Number(candle.close_price), domainMin, domainMax),
    }));
    const yTicks: ChartTick[] = Array.from({ length: 5 }, (_, index) => {
      const value = domainMin + ((domainMax - domainMin) * index) / 4;
      return {
        position: yPosition(value, domainMin, domainMax),
        label: formatCurrency(String(value), this.quoteCurrency()),
      };
    }).reverse();
    return { candles, points, domainMin, domainMax, yTicks };
  });
  protected readonly polyline = computed(() =>
    this.geometry()
      .points.map((point) => `${point.x},${point.y}`)
      .join(' '),
  );
  protected readonly xTicks = computed(() => utcTicks(this.from(), this.to(), this.compact()));
  protected readonly decisionMarkers = computed(() =>
    this.decisions().map((decision) => ({
      id: decision.id,
      action: decision.action,
      x: timeX(decision.decision_timestamp, this.from(), this.to()),
      y: yPosition(
        Number(decision.source_market_price),
        this.geometry().domainMin,
        this.geometry().domainMax,
      ),
    })),
  );
  protected readonly tradeMarkers = computed(() =>
    this.trades().map((trade) => ({
      id: trade.id,
      side: trade.side,
      x: timeX(trade.executed_at, this.from(), this.to()),
      y: yPosition(
        Number(trade.execution_price),
        this.geometry().domainMin,
        this.geometry().domainMax,
      ),
    })),
  );
  protected readonly latest = computed(() => this.geometry().candles.at(-1) ?? null);
  protected readonly first = computed(() => this.geometry().candles[0] ?? null);
  protected readonly formatMoney = (value: string): string =>
    formatCurrency(value, this.quoteCurrency());
  protected readonly chart = CHART;
}
