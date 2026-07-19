import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatSignedPercentage } from '../../shared/formatting/decimal-format';

interface ReturnBar {
  label: string;
  value: string;
  x: number;
  y: number;
  height: number;
  tone: string;
}

@Component({
  selector: 'app-return-comparison-chart',
  template: `
    <div class="values" aria-label="Return values">
      <span
        >Strategy: <strong>{{ format(strategyReturn()) }}</strong></span
      >
      <span
        >Buy-and-hold: <strong>{{ format(benchmarkReturn()) }}</strong></span
      >
    </div>
    <svg viewBox="0 0 640 300" role="img" aria-labelledby="return-title return-description">
      <title id="return-title">Strategy versus buy-and-hold returns</title>
      <desc id="return-description">
        Two bars share a zero reference and a percentage scale that includes positive and negative
        values.
      </desc>
      @for (tick of ticks(); track tick.value) {
        <line class="grid" x1="92" x2="620" [attr.y1]="tick.y" [attr.y2]="tick.y" />
        <text class="axis-label" x="82" [attr.y]="tick.y + 4" text-anchor="end">
          {{ format(tick.value) }}
        </text>
      }
      <line class="zero" x1="92" x2="620" [attr.y1]="zeroY()" [attr.y2]="zeroY()" />
      @for (bar of bars(); track bar.label) {
        <rect
          [attr.class]="'bar ' + bar.tone"
          [attr.x]="bar.x"
          [attr.y]="bar.y"
          width="112"
          [attr.height]="bar.height"
          rx="5"
        />
        <text class="bar-label" [attr.x]="bar.x + 56" y="286" text-anchor="middle">
          {{ bar.label }}
        </text>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .values {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
      margin-bottom: 0.7rem;
      color: #cbd4dc;
    }
    svg {
      display: block;
      width: 100%;
      min-height: 250px;
      overflow: visible;
    }
    .grid {
      stroke: #35414b;
      stroke-width: 1;
    }
    .zero {
      stroke: #87939d;
      stroke-width: 1.5;
      stroke-dasharray: 5 5;
    }
    .axis-label,
    .bar-label {
      fill: #aeb9c2;
      font-size: 13px;
    }
    .bar.strategy {
      fill: #66899b;
      stroke: #8ba8b6;
    }
    .bar.benchmark {
      fill: #7c7567;
      stroke: #a49a87;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnComparisonChart {
  readonly strategyReturn = input.required<string>();
  readonly benchmarkReturn = input.required<string>();
  protected readonly format = formatSignedPercentage;
  private readonly values = computed(() => [
    Number(this.strategyReturn()),
    Number(this.benchmarkReturn()),
  ]);
  private readonly magnitude = computed(() => Math.max(0.01, ...this.values().map(Math.abs)) * 1.2);
  protected readonly zeroY = computed(() => this.y(0));
  protected readonly ticks = computed(() =>
    [-1, -0.5, 0, 0.5, 1].map((part) => ({
      value: String(this.magnitude() * part),
      y: this.y(this.magnitude() * part),
    })),
  );
  protected readonly bars = computed<ReturnBar[]>(() =>
    [
      { label: 'Strategy', value: this.strategyReturn(), x: 190, tone: 'strategy' },
      {
        label: 'Buy-and-hold',
        value: this.benchmarkReturn(),
        x: 405,
        tone: 'benchmark',
      },
    ].map(({ label, value, x, tone }) => {
      const numeric = Number(value);
      const end = this.y(numeric);
      const zero = this.zeroY();
      return {
        label,
        value,
        x,
        y: Math.min(end, zero),
        height: Math.max(2, Math.abs(end - zero)),
        tone,
      };
    }),
  );

  private y(value: number): number {
    return 20 + ((this.magnitude() - value) / (this.magnitude() * 2)) * 230;
  }
}
