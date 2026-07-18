import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { InstrumentCard } from '../../shared/components/instrument-card/instrument-card';
import {
  decimalValueTone,
  formatCurrency,
  formatPercentage,
  formatSignedCurrency,
  formatSignedPercentage,
} from '../../shared/formatting/decimal-format';
import { paperRunStatusLabel } from '../../shared/formatting/presentation-labels';
import { DashboardApiService } from './dashboard-api.service';
import { DashboardOverview, MarketInstrumentCard, ValuedPaperPosition } from './dashboard.models';

@Component({
  selector: 'app-dashboard-page',
  imports: [DatePipe, InstrumentCard],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly api = inject(DashboardApiService);

  readonly overview = signal<DashboardOverview | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
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
        next: (overview) => this.overview.set(overview),
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
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
}
