import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';

import { MetricHelp } from '../../shared/components/metric-help/metric-help';
import {
  formatCurrency,
  formatPercentage,
  formatSignedPercentage,
} from '../../shared/formatting/decimal-format';
import { EdgeEvidenceChart } from './edge-evidence-chart';
import { StrategyResearchApiService } from './strategy-research-api.service';
import {
  CandidateDetail,
  CandidateFilters,
  CandidatePage,
  CandidateStatus,
  EdgeGuidedRun,
  InstrumentIdentity,
  SuggestedAction,
} from './strategy-research.models';

const EMPTY_FILTERS: CandidateFilters = {
  instrument: null,
  status: null,
  action: null,
  predictor: '',
  condition: '',
};

const CONDITIONS = [
  'all',
  'ema20_above_ema50',
  'ema20_below_ema50',
  'high_volatility',
  'normal_volatility',
] as const;

@Component({
  selector: 'app-strategy-research-page',
  imports: [DatePipe, RouterLink, MetricHelp, EdgeEvidenceChart],
  templateUrl: './strategy-research-page.html',
  styleUrl: './strategy-research-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategyResearchPage implements OnDestroy {
  protected readonly Math = Math;
  private readonly api = inject(StrategyResearchApiService);
  private request: Subscription | null = null;
  private detailRequest: Subscription | null = null;
  readonly runs = signal<EdgeGuidedRun[]>([]);
  readonly page = signal<CandidatePage | null>(null);
  readonly filters = signal<CandidateFilters>({ ...EMPTY_FILTERS });
  readonly offset = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly detail = signal<CandidateDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal(false);
  readonly conditions = CONDITIONS;
  readonly summary = computed(() =>
    this.runs().reduce(
      (value, run) => ({
        runs: value.runs + 1,
        evaluated: value.evaluated + run.evaluated_count,
        confirmed: value.confirmed + run.candidate_status_counts.confirmed_candidate,
        rejected:
          value.rejected +
          run.candidate_status_counts.rejected_validation +
          run.candidate_status_counts.rejected_test,
      }),
      { runs: 0, evaluated: 0, confirmed: 0, rejected: 0 },
    ),
  );
  readonly instruments = computed(() => {
    const values = new Map<string, InstrumentIdentity>();
    for (const run of this.runs()) values.set(this.instrumentKey(run.instrument), run.instrument);
    return [...values.values()];
  });

  constructor() {
    this.load();
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.detailRequest?.unsubscribe();
  }
  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = forkJoin({
      runs: this.api.getRuns(),
      candidates: this.api.getCandidates(this.filters(), this.offset()),
    }).subscribe({
      next: ({ runs, candidates }) => {
        this.runs.set(runs.items);
        this.page.set(candidates);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
  applyFilter<K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
    this.offset.set(0);
    this.loadCandidates();
  }
  selectInstrument(value: string): void {
    this.applyFilter(
      'instrument',
      this.instruments().find((item) => this.instrumentKey(item) === value) ?? null,
    );
  }
  selectStatus(value: string): void {
    const status: CandidateStatus | null =
      value === 'confirmed_candidate' ||
      value === 'rejected_validation' ||
      value === 'rejected_test'
        ? value
        : null;
    this.applyFilter('status', status);
  }
  selectAction(value: string): void {
    const action: SuggestedAction | null =
      value === 'long_entry' || value === 'exit_or_avoid' ? value : null;
    this.applyFilter('action', action);
  }
  clearFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
    this.offset.set(0);
    this.loadCandidates();
  }
  previous(): void {
    this.offset.update((value) => Math.max(0, value - 50));
    this.loadCandidates();
  }
  next(): void {
    if (this.page() && this.offset() + 50 < this.page()!.total) {
      this.offset.update((value) => value + 50);
      this.loadCandidates();
    }
  }
  openDetail(id: string): void {
    this.detailRequest?.unsubscribe();
    this.detailLoading.set(true);
    this.detailError.set(false);
    this.detail.set(null);
    this.detailRequest = this.api.getCandidate(id).subscribe({
      next: (value) => {
        this.detail.set(value);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailError.set(true);
        this.detailLoading.set(false);
      },
    });
  }
  closeDetail(): void {
    this.detail.set(null);
    this.detailError.set(false);
  }
  private loadCandidates(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.getCandidates(this.filters(), this.offset()).subscribe({
      next: (value) => {
        this.page.set(value);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
  protected instrumentKey(value: InstrumentIdentity): string {
    return JSON.stringify([value.asset, value.provider, value.market_type, value.interval]);
  }
  protected instrumentLabel(value: InstrumentIdentity | CandidateDetail): string {
    return `${value.asset} · ${value.provider} ${value.market_type} · ${value.interval}`;
  }
  protected statusLabel(value: CandidateStatus): string {
    return (
      {
        confirmed_candidate: 'Confirmed',
        rejected_validation: 'Validation rejected',
        rejected_test: 'Test rejected',
      } as const
    )[value];
  }
  protected actionLabel(value: SuggestedAction): string {
    return value === 'long_entry' ? 'Long entry' : 'Exit or avoid';
  }
  protected human(value: string): string {
    const text = value.replaceAll('_', ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  protected horizon(seconds: number): string {
    if (seconds % 86400 === 0) return `${seconds / 86400}d`;
    if (seconds % 3600 === 0) return `${seconds / 3600}h`;
    return `${seconds / 60}m`;
  }
  protected bin(value: CandidateDetail): string {
    if (value.lower_bound === null) return `≤ ${value.upper_bound}`;
    if (value.upper_bound === null) return `> ${value.lower_bound}`;
    return `(${value.lower_bound}, ${value.upper_bound}]`;
  }
  protected copy(value: string): void {
    void navigator.clipboard?.writeText(value);
  }
  protected percentage = formatPercentage;
  protected signedPercentage = formatSignedPercentage;
  protected money = formatCurrency;
}
