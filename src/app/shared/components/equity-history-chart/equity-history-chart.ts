import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PaperPortfolioSnapshot, PaperRun } from '../../../features/dashboard/dashboard.models';
import {
  decimalValueTone,
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercentage,
} from '../../formatting/decimal-format';

interface EquityPoint {
  timestamp: string;
  equity: string;
  x: number;
  y: number;
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 260;
const CHART_PADDING = 28;
const SNAPSHOT_LIMIT = 500;

@Component({
  selector: 'app-equity-history-chart',
  imports: [DatePipe],
  templateUrl: './equity-history-chart.html',
  styleUrl: './equity-history-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquityHistoryChart {
  readonly run = input.required<PaperRun>();
  readonly snapshots = input.required<PaperPortfolioSnapshot[]>();

  protected readonly isTruncatedWindow = computed(() => this.snapshots().length === SNAPSHOT_LIMIT);
  protected readonly orderedSnapshots = computed(() => {
    const byBoundary = new Map<string, PaperPortfolioSnapshot>();
    for (const snapshot of this.snapshots()) {
      byBoundary.set(snapshot.scheduled_boundary, snapshot);
    }
    return [...byBoundary.values()].sort(
      (left, right) => Date.parse(left.scheduled_boundary) - Date.parse(right.scheduled_boundary),
    );
  });
  protected readonly latestSnapshot = computed(() => this.orderedSnapshots().at(-1) ?? null);

  private readonly geometry = computed(() => {
    const persistedPoints = this.orderedSnapshots().map((snapshot) => ({
      timestamp: snapshot.scheduled_boundary,
      equity: snapshot.equity,
    }));
    const source = this.isTruncatedWindow()
      ? persistedPoints
      : [{ timestamp: this.run().started_at, equity: this.run().initial_cash }, ...persistedPoints];
    const times = source.map((point) => Date.parse(point.timestamp));
    const values = source.map((point) => Number(point.equity));
    const scaleValues = [...values, Number(this.run().initial_cash)];
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minValue = Math.min(...scaleValues);
    const maxValue = Math.max(...scaleValues);
    const drawableWidth = CHART_WIDTH - CHART_PADDING * 2;
    const drawableHeight = CHART_HEIGHT - CHART_PADDING * 2;
    const yCoordinate = (value: number): number =>
      maxValue === minValue
        ? CHART_HEIGHT / 2
        : CHART_PADDING + ((maxValue - value) / (maxValue - minValue)) * drawableHeight;

    const points: EquityPoint[] = source.map((point, index) => ({
      ...point,
      x:
        maxTime === minTime
          ? CHART_PADDING +
            (source.length === 1
              ? drawableWidth / 2
              : (index / (source.length - 1)) * drawableWidth)
          : CHART_PADDING + ((times[index] - minTime) / (maxTime - minTime)) * drawableWidth,
      y: yCoordinate(values[index]),
    }));

    return {
      points,
      baselineY: yCoordinate(Number(this.run().initial_cash)),
    };
  });

  protected readonly chartPoints = computed<EquityPoint[]>(() => this.geometry().points);
  protected readonly polylinePoints = computed(() =>
    this.chartPoints()
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
  );
  protected readonly firstPoint = computed(() => this.chartPoints()[0]);
  protected readonly lastPoint = computed(() => this.chartPoints().at(-1)!);
  protected readonly baselineY = computed(() => this.geometry().baselineY);
  protected readonly decimalValueTone = decimalValueTone;

  protected formatMoney(value: string): string {
    return formatCurrency(value, this.run().account_currency);
  }

  protected formatSignedMoney(value: string): string {
    return formatSignedCurrency(value, this.run().account_currency);
  }

  protected readonly formatSignedPercentage = formatSignedPercentage;
}
