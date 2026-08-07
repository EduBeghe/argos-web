import { DatePipe, JsonPipe, KeyValuePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, timer } from 'rxjs';

import { MetricHelp } from '../../shared/components/metric-help/metric-help';
import { WorkspaceNavigation } from '../../shared/components/workspace-navigation/workspace-navigation';
import { MetricKey } from '../../shared/metrics/metric-definitions';
import { MlRefinementApiService } from './ml-refinement-api.service';
import {
  baselineEngineDraft,
  cartesianUpperBound,
  EngineDraft,
  formatDuration,
  initialFormValue,
  ParameterMode,
  parseParameterGrid,
  RefinementFormValue,
  serializeEngineDraft,
  serializeRefinementRequest,
  unique,
  validContract,
} from './ml-refinement.helpers';
import {
  FeaturePolicy,
  REFINEMENT_STATUSES,
  RefinementContract,
  RefinementEvaluation,
  RefinementEvaluationDetail,
  RefinementRun,
  ScreeningResult,
  ScreeningRun,
} from './ml-refinement.models';

type Tab = 'configure' | 'runs' | 'evidence';
type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type DetailState = 'idle' | 'loading' | 'ready' | 'error';
const TABS: readonly Tab[] = ['configure', 'runs', 'evidence'];
const IMPORTANT_METRICS: Readonly<Record<string, MetricKey>> = {
  median_directional_accuracy: 'mlDirectionalAccuracy',
  median_pearson_correlation: 'mlPearsonCorrelation',
  median_spearman_correlation: 'mlSpearmanCorrelation',
  median_mae_improvement_over_zero: 'mlMaeImprovement',
};

@Component({
  selector: 'app-ml-refinement-page',
  imports: [DatePipe, JsonPipe, KeyValuePipe, MetricHelp, ReactiveFormsModule, WorkspaceNavigation],
  templateUrl: './ml-refinement-page.html',
  styleUrl: './ml-refinement-page.scss',
})
export class MlRefinementPage implements OnInit {
  private readonly api = inject(MlRefinementApiService);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private runRequest?: Subscription;
  private evidenceRequest?: Subscription;
  private detailRequest?: Subscription;
  private sourceRequest?: Subscription;
  private runGeneration = 0;
  private detailGeneration = 0;
  private lastWorkCompleted: number | null = null;

  readonly tabs = TABS;
  readonly tab = signal<Tab>('configure');
  readonly contract = signal<RefinementContract | null>(null);
  readonly contractState = signal<LoadState>('loading');
  readonly contractNotice = signal('');
  readonly screeningRuns = signal<ScreeningRun[]>([]);
  readonly screeningState = signal<LoadState>('loading');
  readonly screeningResults = signal<ScreeningResult[]>([]);
  readonly resultsState = signal<LoadState>('idle');
  readonly selectedSourceRun = signal<ScreeningRun | null>(null);
  readonly selectedSourceResult = signal<ScreeningResult | null>(null);
  readonly engineDrafts = signal<EngineDraft[]>([]);
  readonly selectedDurations = signal<number[]>([]);
  readonly selectedObjectives = signal<string[]>([]);
  readonly allPolicy = signal(true);
  readonly explicitPolicy = signal(false);
  readonly selectedVariables = signal<string[]>([]);
  readonly variableQuery = signal('');
  readonly topKPolicy = signal(false);
  readonly topKText = signal('');
  readonly runs = signal<RefinementRun[]>([]);
  readonly runsState = signal<LoadState>('loading');
  readonly selectedRun = signal<RefinementRun | null>(null);
  readonly evaluations = signal<RefinementEvaluation[]>([]);
  readonly evidenceState = signal<LoadState>('idle');
  readonly detailState = signal<DetailState>('idle');
  readonly evaluationDetail = signal<RefinementEvaluationDetail | null>(null);
  readonly selectedEvaluationId = signal<string | null>(null);
  readonly actionPending = signal(false);
  readonly attemptedSubmit = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly statusFilter = signal('');
  readonly sourceFilter = signal('');
  readonly evidenceClassification = signal('');
  readonly evidenceEngine = signal('');
  readonly evidenceObjective = signal('');
  readonly evidenceDuration = signal<number | null>(null);

  readonly form = new FormGroup({
    confidencePercentages: new FormControl('5, 10, 20', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    feePercentage: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
    slippagePercentage: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
    maximumTrials: new FormControl(40, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    runtimeHours: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    runtimeMinutes: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(59)],
    }),
    seed: new FormControl(1729, { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', { nonNullable: true }),
  });

  readonly completedScreeningRuns = computed(() =>
    this.screeningRuns().filter((run) => run.status === 'completed'),
  );
  readonly filteredVariables = computed(() => {
    const query = this.variableQuery().trim().toLowerCase();
    return (this.contract()?.variables ?? []).filter(
      (item) =>
        !query || `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query),
    );
  });
  readonly variableGroups = computed(() => [
    ...new Set(this.filteredVariables().map((item) => item.category)),
  ]);
  readonly filteredRuns = computed(() =>
    this.runs().filter(
      (run) =>
        (!this.statusFilter() || run.status === this.statusFilter()) &&
        (!this.sourceFilter() || run.source_screening_run_id.includes(this.sourceFilter())),
    ),
  );
  readonly isTerminal = computed(() => this.knownTerminal(this.selectedRun()?.status));
  readonly evidenceOptions = computed(() => ({
    engines: [...new Set(this.evaluations().map((item) => item.engine))],
    objectives: [...new Set(this.evaluations().map((item) => item.objective))],
    durations: [...new Set(this.evaluations().map((item) => item.future_duration_seconds))].sort(
      (a, b) => a - b,
    ),
    classifications: [...new Set(this.evaluations().map((item) => item.classification))],
  }));
  readonly visibleEvaluations = computed(() =>
    this.evaluations().filter(
      (item) =>
        this.evidenceDuration() === null ||
        item.future_duration_seconds === this.evidenceDuration(),
    ),
  );

  ngOnInit(): void {
    this.loadContract();
    this.loadScreeningRuns();
    this.loadRuns();
    document.addEventListener('visibilitychange', this.visibilityChanged);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', this.visibilityChanged);
      this.stopPolling();
      this.runRequest?.unsubscribe();
      this.evidenceRequest?.unsubscribe();
      this.detailRequest?.unsubscribe();
      this.sourceRequest?.unsubscribe();
    });
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
  }
  tabKeydown(event: KeyboardEvent, current: Tab): void {
    const index = TABS.indexOf(current);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    const tab = TABS[next];
    this.setTab(tab);
    queueMicrotask(() => document.getElementById(`ml-refinement-tab-${tab}`)?.focus());
  }

  loadContract(): void {
    this.contractState.set('loading');
    this.contractNotice.set('');
    this.api
      .getContract()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contract) => {
          if (!validContract(contract)) {
            this.contract.set(null);
            this.contractState.set('error');
            return;
          }
          const previous = this.contract();
          this.contract.set(contract);
          this.contractState.set('ready');
          if (previous && this.selectedSourceResult()) this.revalidateContract(contract);
        },
        error: () => this.contractState.set('error'),
      });
  }
  private revalidateContract(contract: RefinementContract): void {
    const before = JSON.stringify([
      this.selectedDurations(),
      this.selectedObjectives(),
      this.selectedVariables(),
      this.engineDrafts().map((item) => item.engine),
    ]);
    this.selectedDurations.update((items) =>
      items.filter((item) => contract.allowed_future_durations_seconds.includes(item)),
    );
    this.selectedObjectives.update((items) =>
      items.filter((item) => contract.supported_prediction_objectives.includes(item)),
    );
    this.selectedVariables.update((items) =>
      items.filter((item) => contract.variables.some((variable) => variable.name === item)),
    );
    this.engineDrafts.update((items) =>
      items.filter((item) => contract.supported_engines.includes(item.engine)),
    );
    const raw = this.form.getRawValue();
    this.form.controls.maximumTrials.setValue(
      Math.min(raw.maximumTrials, contract.validation_limits.maximum_trials),
    );
    const runtime = Math.min(
      raw.runtimeHours * 3_600 + raw.runtimeMinutes * 60,
      contract.validation_limits.maximum_runtime_seconds,
    );
    this.form.controls.runtimeHours.setValue(Math.floor(runtime / 3_600));
    this.form.controls.runtimeMinutes.setValue(Math.floor((runtime % 3_600) / 60));
    if (this.form.controls.notes.value.length > contract.validation_limits.maximum_notes_length)
      this.form.controls.notes.setValue(
        this.form.controls.notes.value.slice(0, contract.validation_limits.maximum_notes_length),
      );
    const after = JSON.stringify([
      this.selectedDurations(),
      this.selectedObjectives(),
      this.selectedVariables(),
      this.engineDrafts().map((item) => item.engine),
    ]);
    if (before !== after)
      this.contractNotice.set(
        'The backend contract changed. Unsupported selections were removed; review the configuration before submitting.',
      );
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
    this.sourceRequest?.unsubscribe();
    const run = this.completedScreeningRuns().find((item) => item.id === id) ?? null;
    this.selectedSourceRun.set(run);
    this.clearDerivedSource();
    if (!run) return;
    this.loadScreeningResults();
  }
  private clearDerivedSource(): void {
    this.selectedSourceResult.set(null);
    this.engineDrafts.set([]);
    this.selectedDurations.set([]);
    this.selectedObjectives.set([]);
    this.allPolicy.set(true);
    this.explicitPolicy.set(false);
    this.selectedVariables.set([]);
    this.topKPolicy.set(false);
    this.topKText.set('');
    this.screeningResults.set([]);
    this.resultsState.set('idle');
    this.error.set('');
    this.attemptedSubmit.set(false);
  }
  loadScreeningResults(): void {
    const run = this.selectedSourceRun();
    if (!run) return;
    this.resultsState.set('loading');
    const expected = run.id;
    this.sourceRequest?.unsubscribe();
    this.sourceRequest = this.api
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
    if (!result || !run || result.run_id !== run.id || !contract) {
      this.selectedSourceResult.set(null);
      this.error.set('The selected screening result does not belong to this run.');
      return;
    }
    const initial = initialFormValue(contract, run, result);
    if (!initial) {
      this.selectedSourceResult.set(null);
      this.error.set(
        'The persisted screening configuration cannot initialize every required parameter.',
      );
      return;
    }
    const draft = baselineEngineDraft(result.engine, run.configuration);
    if (!draft) return;
    this.selectedSourceResult.set(result);
    this.engineDrafts.set([draft]);
    this.selectedDurations.set(initial.durations);
    this.selectedObjectives.set(initial.objectives);
    this.allPolicy.set(true);
    this.explicitPolicy.set(false);
    this.selectedVariables.set([]);
    this.topKPolicy.set(false);
    this.topKText.set('');
    this.form.setValue({
      confidencePercentages: initial.confidencePercentages.join(', '),
      feePercentage: initial.feePercentage,
      slippagePercentage: initial.slippagePercentage,
      maximumTrials: initial.maximumTrials,
      runtimeHours: initial.runtimeHours,
      runtimeMinutes: initial.runtimeMinutes,
      seed: initial.seed,
      notes: initial.notes,
    });
    this.error.set('');
    this.attemptedSubmit.set(false);
  }

  toggleDuration(value: number, checked: boolean): void {
    this.selectedDurations.update((items) =>
      checked
        ? unique([...items, value])
          ? [...items, value]
          : items
        : items.filter((item) => item !== value),
    );
  }
  toggleObjective(value: string, checked: boolean): void {
    this.selectedObjectives.update((items) =>
      checked
        ? unique([...items, value])
          ? [...items, value]
          : items
        : items.filter((item) => item !== value),
    );
  }
  toggleVariable(value: string, checked: boolean): void {
    this.selectedVariables.update((items) =>
      checked
        ? unique([...items, value])
          ? [...items, value]
          : items
        : items.filter((item) => item !== value),
    );
  }
  variableSelected(value: string): boolean {
    return this.selectedVariables().includes(value);
  }
  directionMeaning(value: boolean | null): string {
    return value === true
      ? 'Higher values carry directional meaning.'
      : value === false
        ? 'Higher values are not treated as directional.'
        : 'Direction is not applicable.';
  }
  toggleEngine(engine: string, checked: boolean): void {
    const run = this.selectedSourceRun();
    if (!run) return;
    const without = this.engineDrafts().filter((item) => item.engine !== engine);
    if (!checked) {
      this.engineDrafts.set(without);
      return;
    }
    const baseline = baselineEngineDraft(engine, run.configuration);
    if (!baseline) {
      this.error.set(
        `The persisted screening configuration lacks required ${engine} baseline values.`,
      );
      return;
    }
    this.engineDrafts.set([...without, baseline]);
  }
  engineSelected(engine: string): boolean {
    return this.engineDrafts().some((item) => item.engine === engine);
  }
  parameters(draft: EngineDraft): string[] {
    return Object.keys(draft.parameters);
  }
  setParameterMode(engine: string, parameter: string, mode: ParameterMode): void {
    this.updateDraft(engine, parameter, {
      mode,
      values: mode === 'values' ? '' : '',
      minimum: '',
      maximum: '',
      step: '',
    });
  }
  updateParameter(
    engine: string,
    parameter: string,
    field: 'values' | 'minimum' | 'maximum' | 'step',
    value: string,
  ): void {
    const current = this.engineDrafts().find((item) => item.engine === engine)?.parameters[
      parameter
    ];
    if (!current) return;
    this.updateDraft(engine, parameter, { ...current, [field]: value });
  }
  private updateDraft(
    engine: string,
    parameter: string,
    value: EngineDraft['parameters'][string],
  ): void {
    this.engineDrafts.update((items) =>
      items.map((item) =>
        item.engine === engine
          ? { ...item, parameters: { ...item.parameters, [parameter]: value } }
          : item,
      ),
    );
  }
  parameterError(engine: string, parameter: string): string | null {
    const draft = this.engineDrafts().find((item) => item.engine === engine)?.parameters[parameter];
    return draft ? parseParameterGrid(engine, parameter, draft).error : 'Missing parameter.';
  }
  isBoolean(engine: string, parameter: string): boolean {
    return engine === 'ridge' && parameter === 'fit_intercept';
  }

  featurePolicies(): FeaturePolicy[] | null {
    const policies: FeaturePolicy[] = [];
    if (this.allPolicy()) policies.push({ strategy: 'all' });
    if (this.explicitPolicy()) {
      if (!this.selectedVariables().length || !unique(this.selectedVariables())) return null;
      policies.push({ strategy: 'explicit', variables: this.selectedVariables() });
    }
    if (this.topKPolicy()) {
      const values = this.topKText()
        .split(',')
        .map((item) => Number(item.trim()));
      const maximum = this.contract()?.variables.length ?? 0;
      if (
        !values.length ||
        !unique(values) ||
        values.some((item) => !Number.isInteger(item) || item < 1 || item > maximum)
      )
        return null;
      policies.push({ strategy: 'top_k', values });
    }
    return policies.length ? policies : null;
  }
  confidenceValues(): number[] | null {
    const tokens = this.form.controls.confidencePercentages.value
      .split(',')
      .map((item) => item.trim());
    const values = tokens.map(Number);
    return tokens.length &&
      tokens.every(Boolean) &&
      unique(values) &&
      values.every((item) => Number.isFinite(item) && item > 0 && item <= 100)
      ? values
      : null;
  }
  formValue(): RefinementFormValue | null {
    const contract = this.contract();
    const run = this.selectedSourceRun();
    const result = this.selectedSourceResult();
    const policies = this.featurePolicies();
    const confidence = this.confidenceValues();
    const spaces = this.engineDrafts().map(serializeEngineDraft);
    const raw = this.form.getRawValue();
    const runtime = raw.runtimeHours * 3_600 + raw.runtimeMinutes * 60;
    if (
      !contract ||
      !run ||
      !result ||
      result.run_id !== run.id ||
      this.form.invalid ||
      !this.engineDrafts().length ||
      spaces.some((item) => !item.value) ||
      !this.selectedDurations().length ||
      !unique(this.selectedDurations()) ||
      this.selectedDurations().some(
        (item) => !contract.allowed_future_durations_seconds.includes(item),
      ) ||
      !this.selectedObjectives().length ||
      !unique(this.selectedObjectives()) ||
      this.selectedObjectives().some(
        (item) => !contract.supported_prediction_objectives.includes(item),
      ) ||
      !policies ||
      !confidence ||
      !Number.isInteger(raw.maximumTrials) ||
      raw.maximumTrials < this.engineDrafts().length ||
      raw.maximumTrials > contract.validation_limits.maximum_trials ||
      !Number.isInteger(runtime) ||
      runtime < 1 ||
      runtime > contract.validation_limits.maximum_runtime_seconds ||
      !Number.isInteger(raw.seed) ||
      raw.notes.length > contract.validation_limits.maximum_notes_length
    )
      return null;
    return {
      engines: this.engineDrafts().map((item) => item.engine),
      durations: this.selectedDurations(),
      objectives: this.selectedObjectives(),
      searchSpaces: spaces.map((item) => item.value!),
      featureStrategies: policies,
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
  validationErrors(): string[] {
    const errors: string[] = [];
    if (!this.selectedSourceRun() || !this.selectedSourceResult())
      errors.push('Select compatible persisted screening evidence.');
    if (!this.engineDrafts().length) errors.push('Select at least one engine.');
    if (!this.selectedDurations().length) errors.push('Select at least one future duration.');
    if (!this.selectedObjectives().length) errors.push('Select at least one prediction objective.');
    if (!this.featurePolicies()) errors.push('Configure at least one valid feature policy.');
    if (!this.confidenceValues())
      errors.push('Confidence buckets must be unique percentages in (0, 100].');
    if (
      this.engineDrafts().some((draft) =>
        this.parameters(draft).some((parameter) => this.parameterError(draft.engine, parameter)),
      )
    )
      errors.push('Correct every engine parameter error.');
    if (!this.formValue() && !errors.length)
      errors.push('Correct the highlighted costs, budget, runtime, seed, or notes fields.');
    return errors;
  }
  upperBound(): number | null {
    const value = this.formValue();
    return value ? cartesianUpperBound(value) : null;
  }
  submit(): void {
    this.attemptedSubmit.set(true);
    if (!this.formValue()) return;
    this.enqueue();
  }
  enqueue(): void {
    const run = this.selectedSourceRun();
    const result = this.selectedSourceResult();
    const value = this.formValue();
    if (!run || !result || result.run_id !== run.id || !value || this.actionPending()) return;
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
    this.lastWorkCompleted = null;
    this.selectedRun.set(run);
    this.evaluations.set([]);
    this.resetDetail();
    this.resetEvidenceFilters();
    this.refreshSelectedRun();
    this.loadEvidence();
    this.configurePolling();
  }
  refreshSelectedRun(): void {
    const id = this.selectedRun()?.id;
    if (!id) return;
    const generation = this.runGeneration;
    this.runRequest?.unsubscribe();
    this.runRequest = this.api
      .getRun(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ run }) => {
          if (generation !== this.runGeneration || this.selectedRun()?.id !== id) return;
          const previous = this.selectedRun();
          const progressed =
            this.lastWorkCompleted !== null && run.work_completed !== this.lastWorkCompleted;
          const becameTerminal =
            !this.knownTerminal(previous?.status) && this.knownTerminal(run.status);
          this.lastWorkCompleted = run.work_completed;
          this.upsertRun(run);
          this.selectedRun.set(run);
          if (progressed || becameTerminal) this.loadEvidence();
          this.configurePolling();
        },
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }
  loadEvidence(): void {
    const id = this.selectedRun()?.id;
    if (!id) return;
    const generation = this.runGeneration;
    this.evidenceState.set('loading');
    this.evidenceRequest?.unsubscribe();
    const filters: Record<string, string> = {};
    if (this.evidenceClassification()) filters['classification'] = this.evidenceClassification();
    if (this.evidenceEngine()) filters['engine'] = this.evidenceEngine();
    if (this.evidenceObjective()) filters['objective'] = this.evidenceObjective();
    this.evidenceRequest = this.api
      .getEvaluations(id, filters)
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
  applyEvidenceFilters(): void {
    this.resetDetail();
    this.loadEvidence();
  }
  resetEvidenceFilters(): void {
    this.evidenceClassification.set('');
    this.evidenceEngine.set('');
    this.evidenceObjective.set('');
    this.evidenceDuration.set(null);
  }
  loadEvaluation(id: string): void {
    const runId = this.selectedRun()?.id;
    if (!runId) return;
    this.detailRequest?.unsubscribe();
    const generation = ++this.detailGeneration;
    this.selectedEvaluationId.set(id);
    this.evaluationDetail.set(null);
    this.detailState.set('loading');
    this.detailRequest = this.api
      .getEvaluation(runId, id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          if (generation !== this.detailGeneration || this.selectedEvaluationId() !== id) return;
          this.evaluationDetail.set(detail);
          this.detailState.set('ready');
        },
        error: () => {
          if (generation === this.detailGeneration) this.detailState.set('error');
        },
      });
  }
  resetDetail(): void {
    this.detailRequest?.unsubscribe();
    this.detailGeneration += 1;
    this.selectedEvaluationId.set(null);
    this.evaluationDetail.set(null);
    this.detailState.set('idle');
  }

  cancel(): void {
    const run = this.selectedRun();
    if (
      !run ||
      !this.knownActive(run.status) ||
      !confirm('Cancel this refinement run?') ||
      this.actionPending()
    )
      return;
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
    if (
      !run ||
      !['failed', 'cancelled'].includes(run.status) ||
      !confirm('Retry this refinement run?') ||
      this.actionPending()
    )
      return;
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
  knownActive(status: string | undefined): boolean {
    return status === 'queued' || status === 'running';
  }
  knownTerminal(status: string | undefined): boolean {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
  }
  lifecycleKnown(status: string): boolean {
    return REFINEMENT_STATUSES.includes(status as (typeof REFINEMENT_STATUSES)[number]);
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
    if (value === null || value === undefined) return 'Not available';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
  notesRemaining(): number {
    return (
      (this.contract()?.validation_limits.maximum_notes_length ?? 0) -
      this.form.controls.notes.value.length
    );
  }
  importantMetricEntries(item: RefinementEvaluation): [string, unknown][] {
    return Object.entries(item.aggregate_metrics).filter(([key]) => key in IMPORTANT_METRICS);
  }
  additionalMetricEntries(item: RefinementEvaluation): [string, unknown][] {
    return Object.entries(item.aggregate_metrics).filter(([key]) => !(key in IMPORTANT_METRICS));
  }
  metricHelp(key: string): MetricKey {
    return IMPORTANT_METRICS[key] ?? 'mlRefinement';
  }
  policySummary(policy: FeaturePolicy): string {
    if (policy.strategy === 'all') return 'All variables';
    if (policy.strategy === 'explicit') return `${policy.variables.length} explicit variables`;
    return `Top k: ${policy.values.join(', ')}`;
  }
  engineModeSummary(draft: EngineDraft): string {
    return `${this.label(draft.engine)} (${this.parameters(draft)
      .map((parameter) => draft.parameters[parameter].mode)
      .join('/')})`;
  }
  durationSummary(): string {
    return (
      this.selectedDurations()
        .map((item) => this.duration(item))
        .join(', ') || 'None'
    );
  }
  objectiveSummary(): string {
    return (
      this.selectedObjectives()
        .map((item) => this.label(item))
        .join(', ') || 'None'
    );
  }

  private readonly visibilityChanged = (): void => {
    if (document.hidden) {
      this.stopPolling();
      this.runRequest?.unsubscribe();
    } else if (this.knownActive(this.selectedRun()?.status)) {
      this.refreshSelectedRun();
      this.configurePolling();
    }
  };
  private configurePolling(): void {
    this.stopPolling();
    if (!document.hidden && this.knownActive(this.selectedRun()?.status))
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
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg ?? String(item)).join('; ');
    return error.status
      ? `Request failed (${error.status}). Please retry.`
      : 'Network request failed. Your configuration was preserved.';
  }
}
