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

interface AxisTick {
  value: number;
  position: number;
  label: string;
}

interface TimeTick {
  timestamp: string;
  position: number;
  label: string;
  anchor: 'start' | 'middle' | 'end';
  intermediate: boolean;
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 320;
const PLOT_LEFT = 112;
const PLOT_RIGHT = 30;
const PLOT_TOP = 34;
const PLOT_BOTTOM = 64;
const SNAPSHOT_LIMIT = 500;
const Y_TICK_COUNT = 5;

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
    const rawMin = Math.min(...scaleValues);
    const rawMax = Math.max(...scaleValues);
    const referenceMagnitude = Math.max(Math.abs(rawMin), Math.abs(rawMax), 1);
    const minimumRange = Math.max(referenceMagnitude * 0.005, 1);
    const rawRange = rawMax - rawMin;
    const visualRange = Math.max(rawRange, minimumRange);
    const center = (rawMin + rawMax) / 2;
    const paddedMin = center - visualRange * 0.6;
    const paddedMax = center + visualRange * 0.6;
    const yValues = niceTickValues(paddedMin, paddedMax, Y_TICK_COUNT);
    const domainMin = yValues[0];
    const domainMax = yValues.at(-1)!;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const drawableWidth = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;
    const drawableHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
    const yCoordinate = (value: number): number =>
      PLOT_TOP + ((domainMax - value) / (domainMax - domainMin)) * drawableHeight;
    const xCoordinate = (time: number, index: number): number =>
      maxTime === minTime
        ? PLOT_LEFT +
          (source.length === 1 ? drawableWidth / 2 : (index / (source.length - 1)) * drawableWidth)
        : PLOT_LEFT + ((time - minTime) / (maxTime - minTime)) * drawableWidth;

    const points: EquityPoint[] = source.map((point, index) => ({
      ...point,
      x: xCoordinate(times[index], index),
      y: yCoordinate(values[index]),
    }));
    const yTicks: AxisTick[] = yValues.map((value) => ({
      value,
      position: yCoordinate(value),
      label: `${formatAxisValue(value)} USDT`,
    }));
    const crossesDays =
      new Date(minTime).getUTCDate() !== new Date(maxTime).getUTCDate() ||
      maxTime - minTime >= 86_400_000;
    const xTicks = timeTicks(points, crossesDays);
    const lastPoint = points.at(-1)!;

    return {
      points,
      yTicks,
      xTicks,
      domainMin,
      domainMax,
      baselineY: yCoordinate(Number(this.run().initial_cash)),
      latestLabelX:
        lastPoint.x > CHART_WIDTH - PLOT_RIGHT - 150 ? lastPoint.x - 9 : lastPoint.x + 9,
      latestLabelY: lastPoint.y < PLOT_TOP + 20 ? lastPoint.y + 20 : lastPoint.y - 10,
      latestLabelAnchor: lastPoint.x > CHART_WIDTH - PLOT_RIGHT - 150 ? 'end' : 'start',
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
  protected readonly yTicks = computed(() => this.geometry().yTicks);
  protected readonly xTicks = computed(() => this.geometry().xTicks);
  protected readonly domainMin = computed(() => this.geometry().domainMin);
  protected readonly domainMax = computed(() => this.geometry().domainMax);
  protected readonly baselineY = computed(() => this.geometry().baselineY);
  protected readonly latestLabelX = computed(() => this.geometry().latestLabelX);
  protected readonly latestLabelY = computed(() => this.geometry().latestLabelY);
  protected readonly latestLabelAnchor = computed(() => this.geometry().latestLabelAnchor);
  protected readonly decimalValueTone = decimalValueTone;

  protected formatMoney(value: string): string {
    return formatCurrency(value, this.run().account_currency);
  }

  protected formatSignedMoney(value: string): string {
    return formatSignedCurrency(value, this.run().account_currency);
  }

  protected readonly formatSignedPercentage = formatSignedPercentage;
}

function niceTickValues(minimum: number, maximum: number, count: number): number[] {
  const roughStep = (maximum - minimum) / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceFactor * magnitude;
  let start = Math.floor(minimum / step) * step;
  if (start + step * (count - 1) < maximum) {
    start = Math.ceil(maximum / step) * step - step * (count - 1);
  }
  return Array.from({ length: count }, (_, index) => normalizeFloatingPoint(start + step * index));
}

function normalizeFloatingPoint(value: number): number {
  return Number(value.toPrecision(12));
}

function formatAxisValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function timeTicks(points: EquityPoint[], includeDate: boolean): TimeTick[] {
  const indexes =
    points.length === 1
      ? [0]
      : [
          ...new Set([
            0,
            Math.round((points.length - 1) * 0.25),
            Math.round((points.length - 1) * 0.5),
            Math.round((points.length - 1) * 0.75),
            points.length - 1,
          ]),
        ];
  return indexes.map((index, tickIndex) => ({
    timestamp: points[index].timestamp,
    position: points[index].x,
    label: formatUtcTick(points[index].timestamp, includeDate),
    anchor: tickIndex === 0 ? 'start' : tickIndex === indexes.length - 1 ? 'end' : 'middle',
    intermediate: tickIndex > 0 && tickIndex < indexes.length - 1,
  }));
}

function formatUtcTick(timestamp: string, includeDate: boolean): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(includeDate ? { month: 'short', day: 'numeric' } : {}),
  }).format(new Date(timestamp));
}

