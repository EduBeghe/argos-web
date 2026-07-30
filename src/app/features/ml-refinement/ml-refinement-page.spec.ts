import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { MlRefinementApiService } from './ml-refinement-api.service';
import {
  EnqueueResponse,
  RefinementContract,
  RefinementEvaluationDetail,
  RefinementRun,
  ScreeningResult,
  ScreeningRun,
} from './ml-refinement.models';
import { MlRefinementPage } from './ml-refinement-page';

const contract: RefinementContract = {
  contract_version: 2,
  classification_version: 2,
  variable_registry_version: 1,
  missing_data_policy_version: 1,
  supported_engines: ['ridge', 'lightgbm'],
  supported_prediction_objectives: ['future_return_regression', 'future_direction_classification'],
  allowed_future_durations_seconds: [1800, 3600],
  variables: [
    {
      name: 'return_1',
      description: 'One-candle return',
      category: 'returns',
      lookback_seconds: 300,
      calculation: 'close return',
      calculation_version: 1,
      higher_is_directional: true,
    },
    {
      name: 'volume_20',
      description: 'Relative volume',
      category: 'volume',
      lookback_seconds: 6000,
      calculation: 'volume baseline',
      calculation_version: 1,
      higher_is_directional: null,
    },
  ],
  validation_limits: {
    maximum_trials: 100,
    maximum_runtime_seconds: 14_400,
    maximum_notes_length: 100,
  },
  ui_defaults: { fee_rate: '0.001', slippage_rate: '0.0005', deterministic_seed: 1729 },
};
const sourceRun: ScreeningRun = {
  id: 'source-run',
  status: 'completed',
  asset: 'GENERIC/USD',
  provider: 'venue',
  market_type: 'spot',
  interval: '5m',
  screening_version: 2,
  dataset_fingerprint: 'a'.repeat(64),
  configuration: { alpha: 1 },
  completed_at: '2035-01-01T00:00:00Z',
};
const sourceResult: ScreeningResult = {
  id: 'source-result',
  run_id: sourceRun.id,
  engine: 'ridge',
  future_duration_seconds: 1800,
  evidence_classification: 'insufficient_evidence',
  display_rank: 1,
  pareto_retained: true,
  median_directional_accuracy: '0.55',
  median_pearson_correlation: '0.1',
  median_spearman_correlation: '0.09',
  median_mae_improvement_over_zero: '0.02',
  failed_classification_rules: ['minimum_accuracy'],
};
const completedRun: RefinementRun = {
  id: 'refinement-run',
  experiment_key: 'key',
  source_screening_run_id: sourceRun.id,
  source_screening_result_id: sourceResult.id,
  status: 'completed',
  created_at: '2035-01-01T00:00:00Z',
  started_at: '2035-01-01T00:01:00Z',
  completed_at: '2035-01-01T00:02:00Z',
  failed_at: null,
  evaluations_selected: 1,
  work_completed: 1,
  progress_fraction: '1',
  evaluations_computed: 1,
  evaluations_reused: 0,
  evaluations_omitted: 0,
  budget_exhausted: false,
  termination_reason: null,
  failure_type: null,
  failure_message: null,
  elapsed_seconds: '60',
  cancellation_requested: false,
  normalized_configuration: {},
  worker_id: null,
};

describe('MlRefinementPage', () => {
  const api = {
    getContract: vi.fn<() => Observable<RefinementContract>>(),
    getScreeningRuns: vi.fn(),
    getScreeningResults: vi.fn(),
    getRuns: vi.fn(),
    getRun: vi.fn(),
    enqueue: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    getEvaluations: vi.fn(),
    getEvaluation: vi.fn(),
  };
  beforeEach(() => {
    vi.useRealTimers();
    Object.values(api).forEach((mock) => mock.mockReset());
    api.getContract.mockReturnValue(of(contract));
    api.getScreeningRuns.mockReturnValue(of([sourceRun]));
    api.getScreeningResults.mockReturnValue(of([sourceResult]));
    api.getRuns.mockReturnValue(of([]));
    api.getRun.mockReturnValue(of({ run: completedRun }));
    api.getEvaluations.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [MlRefinementPage],
      providers: [provideRouter([]), { provide: MlRefinementApiService, useValue: api }],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(MlRefinementPage);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }
  function selectSource(component: MlRefinementPage) {
    component.selectSourceRun(sourceRun.id);
    component.selectSourceResult(sourceResult.id);
  }

  it('loads the authoritative contract and exposes a valid accessible tab set with MetricHelp', () => {
    const { fixture, component } = create();
    const tabs = [...fixture.nativeElement.querySelectorAll('[role="tab"]')] as HTMLElement[];
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute('aria-controls')).toBe('ml-refinement-panel-configure');
    selectSource(component);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-metric-help').length).toBeGreaterThan(0);
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
  });

  it('blocks malformed contracts while leaving Runs available', () => {
    api.getContract.mockReturnValue(of({ ...contract, supported_engines: ['ridge', 'ridge'] }));
    const { fixture, component } = create();
    expect(component.contractState()).toBe('error');
    component.setTab('runs');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Durable refinement runs');
  });

  it('propagates multiple durations, a subset objective, combined feature policies and a parameter range to the exact enqueue request', () => {
    api.enqueue.mockReturnValue(
      of({ disposition: 'queued', run: completedRun, location: '/run' } satisfies EnqueueResponse),
    );
    const { component } = create();
    selectSource(component);
    component.toggleDuration(3600, true);
    component.toggleObjective('future_direction_classification', false);
    component.explicitPolicy.set(true);
    component.toggleVariable('return_1', true);
    component.topKPolicy.set(true);
    component.topKText.set('1, 2');
    component.setParameterMode('ridge', 'alpha', 'range');
    component.updateParameter('ridge', 'alpha', 'minimum', '0.5');
    component.updateParameter('ridge', 'alpha', 'maximum', '1.5');
    component.updateParameter('ridge', 'alpha', 'step', '0.5');
    component.submit();
    const body = api.enqueue.mock.calls[0][0];
    expect(body.future_durations_seconds).toEqual([1800, 3600]);
    expect(body.prediction_objectives).toEqual(['future_return_regression']);
    expect(body.feature_selection.strategies).toEqual([
      { strategy: 'all' },
      { strategy: 'explicit', variables: ['return_1'] },
      { strategy: 'top_k', values: [1, 2] },
    ]);
    expect(body.search_space[0].alpha).toEqual({ minimum: 0.5, maximum: 1.5, step: 0.5 });
    expect(body.search_space[0].fit_intercept).toEqual({ values: [true] });
  });

  it('shows field errors and never submits stale parameter values after invalid text', () => {
    const { fixture, component } = create();
    selectSource(component);
    component.updateParameter('ridge', 'alpha', 'values', 'not-a-number');
    component.submit();
    fixture.detectChanges();
    expect(api.enqueue).not.toHaveBeenCalled();
    expect(component.parameterError('ridge', 'alpha')).toContain('finite');
    expect(fixture.nativeElement.textContent).toContain('Correct every engine parameter error');
  });

  it('clears derived configuration when the source changes and rejects a mismatched result', () => {
    const { component } = create();
    selectSource(component);
    component.selectSourceRun('');
    expect(component.selectedSourceResult()).toBeNull();
    expect(component.engineDrafts()).toEqual([]);
    expect(component.selectedDurations()).toEqual([]);
    api.getScreeningResults.mockReturnValue(of([{ ...sourceResult, run_id: 'different' }]));
    component.selectSourceRun(sourceRun.id);
    component.selectSourceResult(sourceResult.id);
    expect(component.selectedSourceResult()).toBeNull();
  });

  it('retries screening-result loading and suppresses stale source responses', () => {
    const first = new Subject<ScreeningResult[]>();
    api.getScreeningResults.mockReturnValueOnce(first).mockReturnValueOnce(of([sourceResult]));
    const { component } = create();
    component.selectSourceRun(sourceRun.id);
    component.selectSourceRun('');
    first.next([sourceResult]);
    expect(component.screeningResults()).toEqual([]);
    component.selectSourceRun(sourceRun.id);
    component.loadScreeningResults();
    expect(api.getScreeningResults).toHaveBeenCalledTimes(3);
  });

  it('preserves the completed form and renders backend detail after enqueue failure', () => {
    api.enqueue.mockReturnValue(
      throwError(() => ({ status: 422, error: { detail: 'maximum_trials is invalid' } })),
    );
    const { component } = create();
    selectSource(component);
    const before = component.form.getRawValue();
    component.submit();
    expect(component.form.getRawValue()).toEqual(before);
    expect(component.error()).toContain('maximum_trials');
  });

  it('keeps one run request in flight and ignores a cancelled older selection', () => {
    const first = new Subject<{ run: RefinementRun }>();
    const second = new Subject<{ run: RefinementRun }>();
    api.getRun.mockReturnValueOnce(first).mockReturnValueOnce(second);
    vi.useFakeTimers();
    const { component } = create();
    const active = { ...completedRun, id: 'active-a', status: 'running', work_completed: 0 };
    component.selectRun(active);
    const other = { ...active, id: 'active-b' };
    component.selectRun(other);
    first.next({ run: { ...active, work_completed: 1 } });
    expect(component.selectedRun()?.id).toBe('active-b');
    second.next({ run: other });
    vi.advanceTimersByTime(5000);
    expect(api.getRun).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('applies supported evidence filters server-side and duration only after complete loading', () => {
    const { component } = create();
    component.selectRun(completedRun);
    api.getEvaluations.mockClear();
    component.evidenceClassification.set('discarded');
    component.evidenceEngine.set('ridge');
    component.evidenceObjective.set('future_return_regression');
    component.evidenceDuration.set(3600);
    component.loadEvidence();
    expect(api.getEvaluations).toHaveBeenCalledWith(completedRun.id, {
      classification: 'discarded',
      engine: 'ridge',
      objective: 'future_return_regression',
    });
  });

  it('keeps fold detail lazy and rejects stale detail responses', () => {
    const first = new Subject<RefinementEvaluationDetail>();
    const second = new Subject<RefinementEvaluationDetail>();
    api.getEvaluation.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { component } = create();
    component.selectRun(completedRun);
    component.loadEvaluation('one');
    component.loadEvaluation('two');
    first.next({ id: 'one' } as RefinementEvaluationDetail);
    expect(component.evaluationDetail()).toBeNull();
    second.next({ id: 'two' } as RefinementEvaluationDetail);
    expect(component.evaluationDetail()?.id).toBe('two');
  });
});
