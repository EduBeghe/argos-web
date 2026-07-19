import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

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
import { decisionActionLabel, marketTypeLabel } from '../../shared/formatting/presentation-labels';
import { PaperEvaluationApiService } from './paper-evaluation-api.service';
import { EvaluationUnavailableReason, PaperEvaluationResponse } from './paper-evaluation.models';
import { ReturnComparisonChart } from './return-comparison-chart';

@Component({
  selector: 'app-evaluation-page',
  imports: [DatePipe, MetricHelp, ReturnComparisonChart, RouterLink],
  templateUrl: './evaluation-page.html',
  styleUrl: './evaluation-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationPage implements OnDestroy {
  private readonly api = inject(PaperEvaluationApiService);
  private request: Subscription | null = null;
  readonly evaluation = signal<PaperEvaluationResponse | null>(null);
  readonly loading = signal(false);
  readonly noActiveRun = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.noActiveRun.set(false);
    this.request = this.api
      .getEvaluation()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (value) => this.evaluation.set(value),
        error: (error: HttpErrorResponse) => {
          if (error.status === 404 && !this.evaluation()) this.noActiveRun.set(true);
          else
            this.error.set(
              this.evaluation() ? 'Evaluation refresh failed.' : 'Evaluation could not be loaded.',
            );
        },
      });
  }

  protected money(value: string | null): string {
    return formatCurrency(value, this.evaluation()?.run.account_currency ?? '');
  }
  protected signedMoney(value: string | null): string {
    return value === null
      ? 'Not enough evidence yet'
      : formatSignedCurrency(value, this.evaluation()?.run.account_currency ?? '');
  }
  protected percentage(value: string | null): string {
    return value === null ? 'Not enough evidence yet' : formatPercentage(value);
  }
  protected signedPercentage(value: string | null): string {
    return value === null ? 'Not enough evidence yet' : formatSignedPercentage(value);
  }
  protected entries(values: Record<string, number>): [string, number][] {
    return Object.entries(values);
  }
  protected sideLabel(value: string): string {
    const normalized = value.trim().replace(/[_-]+/g, ' ');
    return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Unknown';
  }
  protected reason(value: EvaluationUnavailableReason | null): string {
    const reasons: Record<string, string> = {
      no_equity_snapshot: 'No persisted equity snapshot is available yet.',
      no_decision_universe: 'No Strategy decision universe is available yet.',
      missing_compatible_candle: 'Compatible closed-candle evidence is missing.',
      incomplete_candle_evidence: 'Candle evidence is incomplete for at least one instrument.',
      strategy_or_benchmark_unavailable: 'Strategy or benchmark evidence is not available.',
    };
    return value
      ? (reasons[value] ?? 'This evaluation evidence is currently unavailable.')
      : 'Not enough evidence yet';
  }

  protected readonly formatDecimal = formatDecimal;
  protected readonly formatQuantity = formatQuantity;
  protected readonly decimalValueTone = decimalValueTone;
  protected readonly decisionActionLabel = decisionActionLabel;
  protected readonly marketTypeLabel = marketTypeLabel;
}
