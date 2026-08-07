import { DatePipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { MetricHelp } from '../../shared/components/metric-help/metric-help';
import { WorkspaceNavigation } from '../../shared/components/workspace-navigation/workspace-navigation';
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
  NearMiss,
  NearMissDetail,
  NearMissKind,
  NearMissPage,
  PredictiveDiagnostics,
  SuggestedAction,
  TargetedCandidate,
  TargetedCandidateDetail,
  TargetedCandidatePage,
  TargetedCandidateStatus,
  TargetedRefinementSummary,
} from './strategy-research.models';

type WorkspaceTab = 'overview' | 'predictive' | 'near-misses' | 'targeted' | 'historical';
type PanelState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

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
  imports: [DatePipe, JsonPipe, MetricHelp, EdgeEvidenceChart, WorkspaceNavigation],
  templateUrl: './strategy-research-page.html',
  styleUrl: './strategy-research-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategyResearchPage implements OnDestroy {
  protected readonly Math = Math;
  private readonly api = inject(StrategyResearchApiService);
  private readonly subscriptions = new Subscription();
  private selectionVersion = 0;

  readonly runs = signal<EdgeGuidedRun[]>([]);
  readonly runsState = signal<PanelState>('loading');
  readonly selectedInstrumentKey = signal('');
  readonly selectedRunId = signal('');
  readonly activeTab = signal<WorkspaceTab>('overview');
  readonly selectedRun = computed(
    () => this.runs().find((run) => run.id === this.selectedRunId()) ?? null,
  );
  readonly instruments = computed(() => {
    const values = new Map<string, InstrumentIdentity>();
    for (const run of this.runs()) values.set(this.instrumentKey(run.instrument), run.instrument);
    return [...values.values()].sort((a, b) =>
      this.instrumentLabel(a).localeCompare(this.instrumentLabel(b)),
    );
  });
  readonly instrumentRuns = computed(() =>
    this.runs().filter(
      (run) => this.instrumentKey(run.instrument) === this.selectedInstrumentKey(),
    ),
  );

  readonly diagnostics = signal<PredictiveDiagnostics | null>(null);
  readonly diagnosticsState = signal<PanelState>('idle');
  readonly nearMissKind = signal<NearMissKind>('actionable');
  readonly nearMissPage = signal<NearMissPage | null>(null);
  readonly nearMissCursor = signal<number | null>(null);
  readonly nearMissCursorHistory = signal<(number | null)[]>([]);
  readonly nearMissState = signal<PanelState>('idle');
  readonly nearMissDetail = signal<NearMissDetail | null>(null);
  readonly nearMissDetailState = signal<PanelState>('idle');
  readonly targetedSummary = signal<TargetedRefinementSummary | null>(null);
  readonly targetedPage = signal<TargetedCandidatePage | null>(null);
  readonly targetedState = signal<PanelState>('idle');
  readonly targetedStatus = signal<TargetedCandidateStatus | null>(null);
  readonly targetedOffset = signal(0);
  readonly targetedDetail = signal<TargetedCandidateDetail | null>(null);
  readonly targetedDetailState = signal<PanelState>('idle');

  readonly page = signal<CandidatePage | null>(null);
  readonly filters = signal<CandidateFilters>({ ...EMPTY_FILTERS });
  readonly offset = signal(0);
  readonly historicalState = signal<PanelState>('idle');
  readonly detail = signal<CandidateDetail | null>(null);
  readonly detailState = signal<PanelState>('idle');
  readonly conditions = CONDITIONS;

  constructor() {
    this.loadRuns();
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadRuns(): void {
    const version = ++this.selectionVersion;
    this.runsState.set('loading');
    this.subscriptions.add(
      this.api.getRuns().subscribe({
        next: ({ items }) => {
          if (version !== this.selectionVersion) return;
          const runs = [...items].sort(
            (a, b) => Date.parse(b.started_at) - Date.parse(a.started_at),
          );
          this.runs.set(runs);
          this.runsState.set('ready');
          if (!runs.length) return;
          const newest = runs.find((run) => run.status === 'completed') ?? runs[0];
          this.selectedInstrumentKey.set(this.instrumentKey(newest.instrument));
          this.selectNewestCompletedRun();
        },
        error: () => {
          if (version === this.selectionVersion) this.runsState.set('error');
        },
      }),
    );
  }

  selectInstrument(value: string): void {
    this.selectedInstrumentKey.set(value);
    this.selectNewestCompletedRun();
  }

  selectRun(value: string): void {
    if (this.selectedRunId() === value) return;
    this.selectedRunId.set(value);
    this.resetRunPanels();
    this.loadActiveTab();
  }

  selectTab(tab: WorkspaceTab): void {
    this.activeTab.set(tab);
    this.loadActiveTab();
  }

  retryActivePanel(): void {
    if (this.activeTab() === 'predictive') this.loadDiagnostics(true);
    if (this.activeTab() === 'near-misses') this.loadNearMisses(true);
    if (this.activeTab() === 'targeted') this.loadTargeted(true);
    if (this.activeTab() === 'historical') this.loadHistorical(true);
  }

  selectNearMissKind(kind: NearMissKind): void {
    this.nearMissKind.set(kind);
    this.nearMissCursor.set(null);
    this.nearMissCursorHistory.set([]);
    this.nearMissPage.set(null);
    this.nearMissDetail.set(null);
    this.loadNearMisses(true);
  }

  nearMissNext(): void {
    const cursor = this.nearMissPage()?.next_cursor;
    if (cursor === null || cursor === undefined) return;
    this.nearMissCursorHistory.update((values) => [...values, this.nearMissCursor()]);
    this.nearMissCursor.set(cursor);
    this.loadNearMisses(true);
  }

  nearMissPrevious(): void {
    const values = this.nearMissCursorHistory();
    if (!values.length) return;
    this.nearMissCursor.set(values.at(-1) ?? null);
    this.nearMissCursorHistory.set(values.slice(0, -1));
    this.loadNearMisses(true);
  }

  openNearMiss(id: string): void {
    const context = this.context();
    if (!context) return;
    const version = this.selectionVersion;
    this.nearMissDetailState.set('loading');
    this.subscriptions.add(
      this.api.getNearMiss(context.predictiveId, id).subscribe({
        next: (value) => {
          if (version === this.selectionVersion) {
            this.nearMissDetail.set(value);
            this.nearMissDetailState.set('ready');
          }
        },
        error: () => {
          if (version === this.selectionVersion) this.nearMissDetailState.set('error');
        },
      }),
    );
  }

  selectTargetedStatus(value: string): void {
    this.targetedStatus.set(this.isTargetedStatus(value) ? value : null);
    this.targetedOffset.set(0);
    this.loadTargetedCandidates(true);
  }

  targetedPrevious(): void {
    this.targetedOffset.update((value) => Math.max(0, value - 50));
    this.loadTargetedCandidates(true);
  }
  targetedNext(): void {
    if (this.targetedPage()?.has_more) {
      this.targetedOffset.update((value) => value + 50);
      this.loadTargetedCandidates(true);
    }
  }

  openTargetedCandidate(id: string): void {
    const context = this.context();
    if (!context) return;
    const version = this.selectionVersion;
    this.targetedDetailState.set('loading');
    this.subscriptions.add(
      this.api.getTargetedCandidate(context.predictiveId, id).subscribe({
        next: (value) => {
          if (version === this.selectionVersion) {
            this.targetedDetail.set(value);
            this.targetedDetailState.set('ready');
          }
        },
        error: () => {
          if (version === this.selectionVersion) this.targetedDetailState.set('error');
        },
      }),
    );
  }

  applyFilter<K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
    this.offset.set(0);
    this.loadHistorical(true);
  }
  selectHistoricalInstrument(value: string): void {
    this.applyFilter(
      'instrument',
      this.instruments().find((item) => this.instrumentKey(item) === value) ?? null,
    );
  }
  selectStatus(value: string): void {
    this.applyFilter('status', this.isCandidateStatus(value) ? value : null);
  }
  selectAction(value: string): void {
    this.applyFilter('action', value === 'long_entry' || value === 'exit_or_avoid' ? value : null);
  }
  clearFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
    this.offset.set(0);
    this.loadHistorical(true);
  }
  previous(): void {
    this.offset.update((value) => Math.max(0, value - 50));
    this.loadHistorical(true);
  }
  next(): void {
    if (this.page() && this.offset() + 50 < this.page()!.total) {
      this.offset.update((value) => value + 50);
      this.loadHistorical(true);
    }
  }
  openDetail(id: string): void {
    this.detailState.set('loading');
    this.detail.set(null);
    this.subscriptions.add(
      this.api.getCandidate(id).subscribe({
        next: (value) => {
          this.detail.set(value);
          this.detailState.set('ready');
        },
        error: () => this.detailState.set('error'),
      }),
    );
  }
  closeDetails(): void {
    this.detail.set(null);
    this.nearMissDetail.set(null);
    this.targetedDetail.set(null);
    this.detailState.set('idle');
    this.nearMissDetailState.set('idle');
    this.targetedDetailState.set('idle');
  }

  private selectNewestCompletedRun(): void {
    const available = this.instrumentRuns();
    const newest = available.find((run) => run.status === 'completed') ?? available[0];
    this.selectedRunId.set(newest?.id ?? '');
    this.resetRunPanels();
    this.loadActiveTab();
  }
  private resetRunPanels(): void {
    this.selectionVersion += 1;
    this.diagnostics.set(null);
    this.diagnosticsState.set('idle');
    this.nearMissPage.set(null);
    this.nearMissState.set('idle');
    this.nearMissDetail.set(null);
    this.targetedSummary.set(null);
    this.targetedPage.set(null);
    this.targetedState.set('idle');
    this.targetedDetail.set(null);
  }
  private loadActiveTab(): void {
    if (this.activeTab() === 'predictive') this.loadDiagnostics();
    if (this.activeTab() === 'near-misses') this.loadNearMisses();
    if (this.activeTab() === 'targeted') this.loadTargeted();
    if (this.activeTab() === 'historical') this.loadHistorical();
  }
  private loadDiagnostics(force = false): void {
    const context = this.context();
    if (!context || (!force && this.diagnostics())) return;
    const version = this.selectionVersion;
    this.diagnosticsState.set('loading');
    this.subscriptions.add(
      this.api.getDiagnostics(context.predictiveId).subscribe({
        next: (value) => {
          if (version === this.selectionVersion) {
            this.diagnostics.set(value);
            this.diagnosticsState.set('ready');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (version === this.selectionVersion)
            this.diagnosticsState.set(error.status === 404 ? 'unavailable' : 'error');
        },
      }),
    );
  }
  private loadNearMisses(force = false): void {
    const context = this.context();
    if (!context || (!force && this.nearMissPage())) return;
    const version = this.selectionVersion;
    this.nearMissState.set('loading');
    this.subscriptions.add(
      this.api
        .getNearMisses(context.predictiveId, this.nearMissKind(), this.nearMissCursor())
        .subscribe({
          next: (value) => {
            if (version === this.selectionVersion) {
              this.nearMissPage.set(value);
              this.nearMissState.set('ready');
            }
          },
          error: () => {
            if (version === this.selectionVersion) this.nearMissState.set('error');
          },
        }),
    );
  }
  private loadTargeted(force = false): void {
    const context = this.context();
    if (!context || (!force && this.targetedSummary())) return;
    const version = this.selectionVersion;
    this.targetedState.set('loading');
    this.subscriptions.add(
      this.api.getTargetedRefinement(context.predictiveId).subscribe({
        next: (value) => {
          if (version === this.selectionVersion) {
            this.targetedSummary.set(value);
            this.targetedState.set('ready');
            this.loadTargetedCandidates();
          }
        },
        error: (error: HttpErrorResponse) => {
          if (version === this.selectionVersion)
            this.targetedState.set(error.status === 404 ? 'unavailable' : 'error');
        },
      }),
    );
  }
  private loadTargetedCandidates(force = false): void {
    const context = this.context();
    if (!context || (!force && this.targetedPage())) return;
    const version = this.selectionVersion;
    this.subscriptions.add(
      this.api
        .getTargetedCandidates(context.predictiveId, this.targetedStatus(), this.targetedOffset())
        .subscribe({
          next: (value) => {
            if (version === this.selectionVersion) this.targetedPage.set(value);
          },
          error: () => {
            if (version === this.selectionVersion) this.targetedState.set('error');
          },
        }),
    );
  }
  private loadHistorical(force = false): void {
    if (!force && this.page()) return;
    this.historicalState.set('loading');
    this.subscriptions.add(
      this.api.getCandidates(this.filters(), this.offset()).subscribe({
        next: (value) => {
          this.page.set(value);
          this.historicalState.set('ready');
        },
        error: () => this.historicalState.set('error'),
      }),
    );
  }
  private context(): { predictiveId: string } | null {
    const run = this.selectedRun();
    return run ? { predictiveId: run.predictive_edge_run_id } : null;
  }
  private isTargetedStatus(value: string): value is TargetedCandidateStatus {
    return [
      'rejected_training',
      'rejected_validation',
      'rejected_test',
      'confirmed_candidate',
    ].includes(value);
  }
  private isCandidateStatus(value: string): value is CandidateStatus {
    return ['confirmed_candidate', 'rejected_validation', 'rejected_test'].includes(value);
  }

  protected instrumentKey(value: InstrumentIdentity): string {
    return JSON.stringify([value.asset, value.provider, value.market_type, value.interval]);
  }
  protected instrumentLabel(value: InstrumentIdentity | CandidateDetail): string {
    return `${value.asset} · ${value.provider} ${value.market_type} · ${value.interval}`;
  }
  protected statusLabel(value: string): string {
    return this.human(value);
  }
  protected actionLabel(value: SuggestedAction | string | null): string {
    return value ? this.human(value) : 'Not available';
  }
  protected human(value: string): string {
    const text = value.replaceAll('_', ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  protected duration(seconds: number | undefined): string {
    if (seconds === undefined) return 'Not available';
    if (seconds % 86400 === 0) return `${seconds / 86400}d`;
    if (seconds % 3600 === 0) return `${seconds / 3600}h`;
    return `${seconds / 60}m`;
  }
  protected count(summary: TargetedRefinementSummary, key: string): number | null {
    const value = summary.summary[key];
    return typeof value === 'number' ? value : null;
  }
  protected sortedCounts(values: Record<string, number>): [string, number][] {
    return Object.entries(values).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }
  protected keyValueEntries<T>(values: Record<string, T>): [string, T][] {
    return Object.entries(values).sort(([left], [right]) => left.localeCompare(right));
  }
  protected maxCount(values: Record<string, number>): number {
    return Math.max(1, ...Object.values(values));
  }
  protected stage(candidate: TargetedCandidate, name: 'training' | 'validation' | 'test') {
    return candidate[`${name}_metrics`];
  }
  protected marginExplanation(item: NearMiss): string {
    return item.failed_requirements.length
      ? `Advancement requires: ${item.failed_requirements.map((value) => this.human(value)).join(', ')}.`
      : 'All recorded requirements passed.';
  }
  protected copy(value: string): void {
    void navigator.clipboard?.writeText(value);
  }
  protected percentage = formatPercentage;
  protected signedPercentage = formatSignedPercentage;
  protected money = formatCurrency;
}
