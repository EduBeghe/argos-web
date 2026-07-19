import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { finalize, Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';

import { EquityHistoryChart } from '../../shared/components/equity-history-chart/equity-history-chart';
import { InstrumentCard } from '../../shared/components/instrument-card/instrument-card';
import { MetricHelp } from '../../shared/components/metric-help/metric-help';
import {
  decimalValueTone,
  formatCurrency,
  formatPercentage,
  formatSignedCurrency,
  formatSignedPercentage,
} from '../../shared/formatting/decimal-format';
import { paperRunStatusLabel } from '../../shared/formatting/presentation-labels';
import { DashboardApiService } from './dashboard-api.service';
import {
  DashboardOverview,
  MarketInstrumentCard,
  PaperPortfolioSnapshot,
  PaperRun,
  ValuedPaperPosition,
} from './dashboard.models';
import { PaperHistoryApiService } from '../paper-history/paper-history-api.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [DatePipe, EquityHistoryChart, InstrumentCard, MetricHelp, RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnDestroy {
  private readonly api = inject(DashboardApiService);
  private readonly historyApi = inject(PaperHistoryApiService);
  private historySubscription: Subscription | null = null;
  private historyRequestId = 0;

  readonly overview = signal<DashboardOverview | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly equitySnapshots = signal<PaperPortfolioSnapshot[]>([]);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly historyRunId = signal<string | null>(null);
  readonly orderedInstruments = computed(() =>
    [...(this.overview()?.instruments ?? [])].sort(
      (left, right) => left.instrument.display_order - right.instrument.display_order,
    ),
  );

  constructor() {
    this.refresh();
  }

  refresh(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getOverview()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (overview) => {
          this.overview.set(overview);
          this.loadHistoryForRun(overview.paper.run);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  ngOnDestroy(): void {
    this.historySubscription?.unsubscribe();
  }

  retryHistory(): void {
    const run = this.overview()?.paper.run;
    if (run) this.loadHistoryForRun(run);
  }

  instrumentKey(card: MarketInstrumentCard): string {
    const value = card.instrument;
    return [value.asset, value.provider, value.market_type, value.interval].join('|');
  }

  valuedPosition(card: MarketInstrumentCard): ValuedPaperPosition | null {
    return (
      this.overview()?.paper.portfolio?.positions.find(
        (position) =>
          position.asset === card.instrument.asset &&
          position.provider === card.instrument.provider &&
          position.market_type === card.instrument.market_type &&
          position.interval === card.instrument.interval,
      ) ?? null
    );
  }

  protected formatMoney(value: string | null): string {
    return formatCurrency(value, this.overview()?.paper.portfolio?.account_currency ?? 'USDT');
  }

  protected readonly formatPercentage = formatPercentage;
  protected readonly formatSignedPercentage = formatSignedPercentage;
  protected readonly decimalValueTone = decimalValueTone;
  protected readonly paperRunStatusLabel = paperRunStatusLabel;

  protected formatSignedMoney(value: string): string {
    return formatSignedCurrency(
      value,
      this.overview()?.paper.portfolio?.account_currency ?? 'USDT',
    );
  }

  private errorMessage(error: HttpErrorResponse): string {
    if (error.status === 409) {
      return 'The portfolio could not be valued with the available evidence.';
    }
    return 'The dashboard could not be loaded. Check the connection and try again.';
  }

  private loadHistoryForRun(run: PaperRun | null): void {
    this.historySubscription?.unsubscribe();
    const requestId = ++this.historyRequestId;

    if (!run) {
      this.historyRunId.set(null);
      this.equitySnapshots.set([]);
      this.historyLoading.set(false);
      this.historyError.set(null);
      return;
    }

    if (this.historyRunId() !== run.id) {
      this.historyRunId.set(run.id);
      this.equitySnapshots.set([]);
    }
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.historySubscription = this.historyApi.getEquitySnapshots(run.id).subscribe({
      next: (snapshots) => {
        if (requestId !== this.historyRequestId || this.historyRunId() !== run.id) return;
        this.equitySnapshots.set(snapshots);
        this.historyLoading.set(false);
      },
      error: () => {
        if (requestId !== this.historyRequestId || this.historyRunId() !== run.id) return;
        this.historyError.set('Equity history could not be loaded');
        this.historyLoading.set(false);
      },
    });
  }
}
