import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { WindowEvidence } from './strategy-research.models';

interface Point {
  x: number;
  y: number;
  value: string;
  ordinal: number;
}

@Component({
  selector: 'app-edge-evidence-chart',
  template: `
    <svg viewBox="0 0 680 250" role="img" aria-labelledby="edge-chart-title edge-chart-desc">
      <title id="edge-chart-title">Return difference from production by walk-forward window</title>
      <desc id="edge-chart-desc">
        Validation and isolated test return differences. Missing test evidence is shown as a gap.
      </desc>
      <line class="zero" x1="52" [attr.y1]="zeroY()" x2="662" [attr.y2]="zeroY()" />
      <text x="8" [attr.y]="zeroY() + 4">0%</text>
      <polyline class="validation" [attr.points]="points(validationPoints())" />
      @for (segment of testSegments(); track $index) {
        <polyline class="test" [attr.points]="points(segment)" />
      }
      @for (point of validationPoints(); track point.ordinal) {
        <circle class="validation" [attr.cx]="point.x" [attr.cy]="point.y" r="4">
          <title>Window {{ point.ordinal }} validation: {{ percent(point.value) }}</title>
        </circle>
      }
      @for (point of testPoints(); track point.ordinal) {
        <circle class="test" [attr.cx]="point.x" [attr.cy]="point.y" r="4">
          <title>Window {{ point.ordinal }} test: {{ percent(point.value) }}</title>
        </circle>
      }
      <text class="axis" x="52" y="242">Window {{ firstOrdinal() }}</text>
      <text class="axis" x="662" y="242" text-anchor="end">Window {{ lastOrdinal() }}</text>
      <g class="legend">
        <text x="52" y="20">— Validation</text>
        <text x="170" y="20">— Test</text>
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      width: 100%;
      min-height: 220px;
      background: #182128;
      border: 1px solid #35434d;
      border-radius: 0.65rem;
    }
    line.zero {
      stroke: #71808a;
      stroke-dasharray: 5 5;
    }
    polyline {
      fill: none;
      stroke-width: 2.2;
    }
    .validation {
      stroke: #8eb3c7;
      fill: #182128;
    }
    .test {
      stroke: #b3a17d;
      fill: #182128;
    }
    text {
      fill: #aab7c0;
      font-size: 12px;
    }
    .legend text {
      font-size: 13px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EdgeEvidenceChart {
  readonly windows = input.required<WindowEvidence[]>();
  private readonly values = computed(() =>
    this.windows().flatMap((item) => [
      Number(item.validation_metrics.return_difference_from_production),
      ...(item.test_metrics ? [Number(item.test_metrics.return_difference_from_production)] : []),
    ]),
  );
  private readonly domain = computed(() => {
    const values = [...this.values(), 0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.12, 0.001);
    return [min - padding, max + padding] as const;
  });
  readonly validationPoints = computed(() => this.series(false));
  readonly testPoints = computed(() => this.series(true));
  readonly testSegments = computed(() => {
    const segments: Point[][] = [];
    let current: Point[] = [];
    for (const item of this.windows()) {
      if (!item.test_metrics) {
        if (current.length) segments.push(current);
        current = [];
      } else current.push(this.point(item, item.test_metrics.return_difference_from_production));
    }
    if (current.length) segments.push(current);
    return segments;
  });
  readonly zeroY = computed(() => this.y(0));
  readonly firstOrdinal = computed(() => this.windows()[0]?.window_ordinal ?? 0);
  readonly lastOrdinal = computed(() => this.windows().at(-1)?.window_ordinal ?? 0);

  protected points(values: Point[]): string {
    return values.map((p) => `${p.x},${p.y}`).join(' ');
  }
  protected percent(value: string): string {
    return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(
      Number(value),
    );
  }
  private series(test: boolean): Point[] {
    return this.windows().flatMap((item) => {
      const metric = test ? item.test_metrics : item.validation_metrics;
      return metric ? [this.point(item, metric.return_difference_from_production)] : [];
    });
  }
  private point(item: WindowEvidence, value: string): Point {
    const index = this.windows().indexOf(item);
    const count = Math.max(this.windows().length - 1, 1);
    return {
      x: 52 + (index / count) * 610,
      y: this.y(Number(value)),
      value,
      ordinal: item.window_ordinal,
    };
  }
  private y(value: number): number {
    const [min, max] = this.domain();
    return 32 + ((max - value) / (max - min)) * 180;
  }
}
