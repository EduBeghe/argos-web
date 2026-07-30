import { DatePipe, JsonPipe, KeyValuePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, timer } from 'rxjs';

import { MlRefinementApiService } from './ml-refinement-api.service';
import {
  baselineSearchSpace,
  cartesianUpperBound,
  formatDuration,
  initialFormValue,
  RefinementFormValue,
  serializeRefinementRequest,
} from './ml-refinement.helpers';
import {
  EngineSearchSpace,
  RefinementContract,
  RefinementEvaluation,
  RefinementEvaluationDetail,
  RefinementRun,
  ScreeningResult,
  ScreeningRun,
} from './ml-refinement.models';

type Tab = 'configure' | 'runs' | 'evidence';
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-ml-refinement-page',
  imports: [DatePipe, JsonPipe, KeyValuePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './ml-refinement-page.html',
  styleUrl: './ml-refinement-page.scss',
})
export class MlRefinementPage implements OnInit {
  private readonly api = inject(MlRefinementApiService);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private runGeneration = 0;

  readonly tab = signal<Tab>('configure');
  readonly contract = signal<RefinementContract | null>(null);
  readonly contractState = signal<LoadState>('loading');
  readonly screeningRuns = signal<ScreeningRun[]>([]);
  readonly screeningState = signal<LoadState>('loading');
  readonly screeningResults = signal<ScreeningResult[]>([]);
  readonly resultsState = signal<LoadState>('idle');
  readonly selectedSourceRun = signal<ScreeningRun | null>(null);
  readonly selectedSourceResult = signal<ScreeningResult | null>(null);
  readonly searchSpaces = signal<EngineSearchSpace[]>([]);
  readonly runs = signal<RefinementRun[]>([]);
  readonly runsState = signal<LoadState>('loading');
  readonly selectedRun = signal<RefinementRun | null>(null);
  readonly evaluations = signal<RefinementEvaluation[]>([]);
  readonly evidenceState = signal<LoadState>('idle');
  readonly evaluationDetail = signal<RefinementEvaluationDetail | null>(null);
  readonly detailErrors = signal<Record<string, string>>({});
  readonly actionPending = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly statusFilter = signal('');
  readonly sourceFilter = signal('');

  readonly form = new FormGroup({
    confidencePercentages: new FormControl('5, 10, 20', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    feePercentage: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(100)],
    }),
    slippagePercentage: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(100)],
    }),
    maximumTrials: new FormControl(40, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    runtimeHours: new FormControl(2, { nonNullable: true, validators: [Validators.min(0)] }),
    runtimeMinutes: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(59)],
    }),
    seed: new FormControl(1729, { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', { nonNullable: true }),
  });

  readonly completedScreeningRuns = computed(() =>
    this.screeningRuns().filter((run) => run.status === 'completed'),
  );
  readonly filteredRuns = computed(() =>
    this.runs().filter(
      (run) =>
        (!this.statusFilter() || run.status === this.statusFilter()) &&
        (!this.sourceFilter() || run.source_screening_run_id.includes(this.sourceFilter())),
    ),
  );
  readonly isTerminal = computed(() => {
    const status = this.selectedRun()?.status;
    return status === 'completed' || status === 'failed' || status === 'cancelled';
  });

  ngOnInit(): void {
    this.loadContract();
    this.loadScreeningRuns();
    this.loadRuns();
    document.addEventListener('visibilitychange', this.visibilityChanged);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', this.visibilityChanged);
      this.stopPolling();
    });
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  loadContract(): void {
    this.contractState.set('loading');
    this.api
      .getContract()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contract) => {
          const valid =
            contract.supported_engines.length &&
            contract.supported_prediction_objectives.length &&
            contract.allowed_future_durations_seconds.length &&
            contract.variables.length;
          this.contract.set(valid ? contract : null);
          this.contractState.set(valid ? 'ready' : 'error');
        },
        error: () => this.contractState.set('error'),
      });
  }

  loadScreeningRuns(): void {
    this.screeningState.set('loading');
    this.api
      .getScreeningRuns()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (runs) => {
          this.screeningRuns.set(runs);
          this.screeningState.set('ready');
        },
        error: () => this.screeningState.set('error'),
      });
  }

  selectSourceRun(id: string): void {
    const run = this.completedScreeningRuns().find((item) => item.id === id) ?? null;
    this.selectedSourceRun.set(run);
    this.selectedSourceResult.set(null);
    this.searchSpaces.set([]);
    this.screeningResults.set([]);
    if (!run) return;
    this.resultsState.set('loading');
    const expected = run.id;
    this.api
      .getScreeningResults(run.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          if (this.selectedSourceRun()?.id !== expected) return;
          this.screeningResults.set(results);
          this.resultsState.set('ready');
        },
        error: () => this.resultsState.set('error'),
      });
  }

  selectSourceResult(id: string): void {
    const result = this.screeningResults().find((item) => item.id === id) ?? null;
    const run = this.selectedSourceRun();
    const contract = this.contract();
    this.selectedSourceResult.set(result);
    if (!result || !run || !contract) return;
    const value = initialFormValue(contract, run, result);
    if (!value) {
      this.error.set(
        'The persisted screening configuration cannot initialize every required parameter.',
      );
      return;
    }
    this.searchSpaces.set(value.searchSpaces);
    this.form.setValue({
      confidencePercentages: value.confidencePercentages.join(', '),
      feePercentage: value.feePercentage,
      slippagePercentage: value.slippagePercentage,
      maximumTrials: value.maximumTrials,
      runtimeHours: value.runtimeHours,
      runtimeMinutes: value.runtimeMinutes,
      seed: value.seed,
      notes: value.notes,
    });
  }

  toggleEngine(engine: string, checked: boolean): void {
    const run = this.selectedSourceRun();
    if (!run) return;
    const without = this.searchSpaces().filter((space) => space.engine !== engine);
    if (!checked) {
      this.searchSpaces.set(without);
      return;
    }
    const baseline = baselineSearchSpace(engine, run.configuration);
    if (!baseline) {
      this.error.set(
        `The persisted screening configuration lacks required ${engine} baseline values.`,
      );
      return;
    }
    this.searchSpaces.set([...without, baseline]);
  }

  updateValues(engine: string, parameter: string, input: string): void {
    const current = this.searchSpaces();
    const values = input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => (value === 'true' ? true : value === 'false' ? false : Number(value)));
    if (
      !values.length ||
      values.some((value) => typeof value === 'number' && !Number.isFinite(value)) ||
      new Set(values.map(String)).size !== values.length
    )
      return;
    this.searchSpaces.set(
      current.map((space) =>
        space.engine === engine ? { ...space, [parameter]: { values } } : space,
      ),
    );
  }

  gridValues(space: EngineSearchSpace, parameter: string): string {
    const grid = space[parameter];
    return typeof grid === 'object' && grid.values ? grid.values.join(', ') : '';
  }

  formValue(): RefinementFormValue | null {
    const contract = this.contract();
    const result = this.selectedSourceResult();
    if (!contract || !result || this.form.invalid || !this.searchSpaces().length) return null;
    const raw = this.form.getRawValue();
    const confidence = raw.confidencePercentages.split(',').map(Number);
    const runtime = raw.runtimeHours * 3_600 + raw.runtimeMinutes * 60;
    if (
      confidence.some((value) => !Number.isFinite(value) || value <= 0 || value > 100) ||
      new Set(confidence).size !== confidence.length ||
      raw.maximumTrials < this.searchSpaces().length ||
      raw.maximumTrials > contract.validation_limits.maximum_trials ||
      runtime < 1 ||
      runtime > contract.validation_limits.maximum_runtime_seconds ||
      raw.notes.length > contract.validation_limits.maximum_notes_length
    )
      return null;
    return {
      engines: this.searchSpaces().map((space) => space.engine),
      durations: [result.future_duration_seconds],
      objectives: [...contract.supported_prediction_objectives],
      searchSpaces: this.searchSpaces(),
      featureStrategies: [{ strategy: 'all' }],
      confidencePercentages: confidence,
      feePercentage: raw.feePercentage,
      slippagePercentage: raw.slippagePercentage,
      maximumTrials: raw.maximumTrials,
      runtimeHours: raw.runtimeHours,
      runtimeMinutes: raw.runtimeMinutes,
      seed: raw.seed,
      notes: raw.notes,
    };
  }

  upperBound(): number {
    const value = this.formValue();
    return value ? cartesianUpperBound(value) : 0;
  }

  enqueue(): void {
    const run = this.selectedSourceRun();
    const result = this.selectedSourceResult();
    const value = this.formValue();
    if (!run || !result || !value || this.actionPending()) return;
    this.actionPending.set(true);
    this.error.set('');
    this.api
      .enqueue(serializeRefinementRequest(run.id, result.id, value))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.actionPending.set(false);
          this.message.set(this.dispositionMessage(response.disposition));
          this.upsertRun(response.run);
          this.selectRun(response.run);
          this.tab.set('runs');
        },
        error: (error: HttpErrorResponse) => {
          this.actionPending.set(false);
          this.error.set(this.errorMessage(error));
        },
      });
  }

  loadRuns(): void {
    this.runsState.set('loading');
    this.api
      .getRuns()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (runs) => {
          this.runs.set(runs);
          this.runsState.set('ready');
        },
        error: () => this.runsState.set('error'),
      });
  }

  selectRun(run: RefinementRun): void {
    this.runGeneration += 1;
    this.selectedRun.set(run);
    this.evaluations.set([]);
    this.evaluationDetail.set(null);
    this.refreshSelectedRun();
    this.loadEvidence();
    this.configurePolling();
  }

  refreshSelectedRun(): void {
    const id = this.selectedRun()?.id;
    if (!id) return;
    const generation = this.runGeneration;
    this.api
      .getRun(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ run }) => {
          if (generation !== this.runGeneration || this.selectedRun()?.id !== id) return;
          this.upsertRun(run);
          this.selectedRun.set(run);
          this.configurePolling();
        },
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  loadEvidence(): void {
    const id = this.selectedRun()?.id;
    if (!id) return;
    this.evidenceState.set('loading');
    const generation = this.runGeneration;
    this.api
      .getEvaluations(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          if (generation !== this.runGeneration) return;
          this.evaluations.set(items);
          this.evidenceState.set('ready');
        },
        error: () => this.evidenceState.set('error'),
      });
  }

  loadEvaluation(id: string): void {
    const runId = this.selectedRun()?.id;
    if (!runId) return;
    this.api
      .getEvaluation(runId, id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => this.evaluationDetail.set(detail),
        error: () =>
          this.detailErrors.update((errors) => ({ ...errors, [id]: 'Detail unavailable. Retry.' })),
      });
  }

  cancel(): void {
    const run = this.selectedRun();
    if (!run || !confirm('Cancel this refinement run?')) return;
    this.actionPending.set(true);
    this.api
      .cancel(run.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.actionPending.set(false);
          this.upsertRun(updated);
          this.selectedRun.set(updated);
          this.configurePolling();
        },
        error: (error: HttpErrorResponse) => {
          this.actionPending.set(false);
          this.error.set(this.errorMessage(error));
          if (error.status === 409) this.refreshSelectedRun();
        },
      });
  }

  retry(): void {
    const run = this.selectedRun();
    if (!run || !confirm('Retry this refinement run?')) return;
    this.actionPending.set(true);
    this.api
      .retry(run.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.actionPending.set(false);
          this.message.set(this.dispositionMessage(response.disposition));
          this.upsertRun(response.run);
          this.selectRun(response.run);
        },
        error: (error: HttpErrorResponse) => {
          this.actionPending.set(false);
          this.error.set(this.errorMessage(error));
          if (error.status === 409) this.refreshSelectedRun();
        },
      });
  }

  duration(seconds: number): string {
    return formatDuration(seconds);
  }
  abbreviate(value: string): string {
    return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
  }
  label(value: string): string {
    return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  metric(value: unknown): string {
    return value === null || value === undefined ? 'Not available' : String(value);
  }
  notesRemaining(): number {
    return (
      (this.contract()?.validation_limits.maximum_notes_length ?? 0) -
      this.form.controls.notes.value.length
    );
  }

  private readonly visibilityChanged = (): void => {
    if (document.hidden) this.stopPolling();
    else {
      this.refreshSelectedRun();
      this.configurePolling();
    }
  };
  private configurePolling(): void {
    this.stopPolling();
    const status = this.selectedRun()?.status;
    if (!document.hidden && (status === 'queued' || status === 'running'))
      this.polling = timer(5_000, 5_000).subscribe(() => this.refreshSelectedRun());
  }
  private stopPolling(): void {
    this.polling?.unsubscribe();
    this.polling = undefined;
  }
  private upsertRun(run: RefinementRun): void {
    this.runs.update((items) => [run, ...items.filter((item) => item.id !== run.id)]);
  }
  private dispositionMessage(disposition: string): string {
    return `Refinement ${this.label(disposition).toLowerCase()}. The backend remains authoritative for execution and evidence.`;
  }
  private errorMessage(error: HttpErrorResponse): string {
    const detail = error.error?.detail;
    return typeof detail === 'string'
      ? detail
      : error.status
        ? `Request failed (${error.status}). Please retry.`
        : 'Network request failed. Your configuration was preserved.';
  }
}
