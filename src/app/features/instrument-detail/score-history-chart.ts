import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatDecimal } from '../../shared/formatting/decimal-format';
import { MetricHelp } from '../../shared/components/metric-help/metric-help';
import { DecisionSnapshot, MarketScore } from './instrument-detail.models';
import { CHART, timeX, utcTicks, yPosition } from './chart-geometry';

@Component({
  selector: 'app-score-history-chart',
  imports: [MetricHelp],
  templateUrl: './score-history-chart.html',
  styleUrl: './history-charts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreHistoryChart {
  readonly scores = input.required<MarketScore[]>();
  readonly decisions = input.required<DecisionSnapshot[]>();
  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly compact = input(false);

  protected readonly ordered = computed(() =>
    [...this.scores()].sort(
      (left, right) => Date.parse(left.candle_open_time) - Date.parse(right.candle_open_time),
    ),
  );
  protected readonly polyline = computed(() =>
    this.ordered()
      .map(
        (score) =>
          `${timeX(score.candle_open_time, this.from(), this.to())},${yPosition(Number(score.overall_score), -1, 1)}`,
      )
      .join(' '),
  );
  protected readonly xTicks = computed(() => utcTicks(this.from(), this.to(), this.compact()));
  protected readonly decisionMarkers = computed(() =>
    this.decisions().map((decision) => ({
      id: decision.id,
      action: decision.action,
      x: timeX(decision.decision_timestamp, this.from(), this.to()),
      y: yPosition(Number(decision.source_overall_score), -1, 1),
    })),
  );
  protected readonly latest = computed(() => this.ordered().at(-1) ?? null);
  protected readonly formatScore = (value: string): string => formatDecimal(value, 3);
  protected readonly yTicks = [1, 0.5, 0, -0.5, -1].map((value) => ({
    value,
    y: yPosition(value, -1, 1),
  }));
  protected readonly zeroY = yPosition(0, -1, 1);
  protected readonly chart = CHART;
}
