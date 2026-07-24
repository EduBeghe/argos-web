import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { StrategyResearchApiService } from './strategy-research-api.service';
import { StrategyResearchPage } from './strategy-research-page';
import { EdgeGuidedRun, RunPage, TargetedCandidatePage } from './strategy-research.models';

describe('StrategyResearchPage workspace', () => {
  const api = {
    getRuns: vi.fn(),
    getDiagnostics: vi.fn(),
    getNearMisses: vi.fn(),
    getNearMiss: vi.fn(),
    getTargetedRefinement: vi.fn(),
    getTargetedCandidates: vi.fn(),
    getTargetedCandidate: vi.fn(),
    getCandidates: vi.fn(),
    getCandidate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getRuns.mockReturnValue(of(runPage()));
    api.getDiagnostics.mockReturnValue(of(diagnostics()));
    api.getNearMisses.mockReturnValue(of({ items: [], next_cursor: null, has_more: false }));
    api.getNearMiss.mockReturnValue(of(nearMissDetail()));
    api.getTargetedRefinement.mockReturnValue(of(targetedSummary()));
    api.getTargetedCandidates.mockReturnValue(of(targetedPage()));
    api.getTargetedCandidate.mockReturnValue(
      of({ ...targetedPage().items[0], run_id: 'targeted' }),
    );
    api.getCandidates.mockReturnValue(of({ items: [], total: 0, limit: 50, offset: 0 }));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: StrategyResearchApiService, useValue: api }],
    });
  });

  it('builds complete instrument identities and selects the newest completed run', () => {
    api.getRuns.mockReturnValue(
      of(
        runPage([
          run('older', 'ALPHA/USD', '2026-01-01'),
          run('newest', 'ALPHA/USD', '2026-02-01'),
          run('other', 'BETA/USD', '2026-03-01'),
        ]),
      ),
    );
    const fixture = render();
    expect(fixture.componentInstance.selectedRun()?.id).toBe('other');
    expect(
      fixture.componentInstance
        .instruments()
        .map((item) => [item.asset, item.provider, item.market_type, item.interval]),
    ).toEqual([
      ['ALPHA/USD', 'venue', 'spot', '5m'],
      ['BETA/USD', 'venue', 'spot', '5m'],
    ]);
    fixture.componentInstance.selectInstrument(
      JSON.stringify(['ALPHA/USD', 'venue', 'spot', '5m']),
    );
    expect(fixture.componentInstance.selectedRun()?.id).toBe('newest');
  });

  it('lazy-loads only the selected panel with predictive_edge_run_id', () => {
    const fixture = render();
    expect(api.getDiagnostics).not.toHaveBeenCalled();
    fixture.componentInstance.selectTab('predictive');
    expect(api.getDiagnostics).toHaveBeenCalledWith('predictive-run-1');
    expect(api.getNearMisses).not.toHaveBeenCalled();
    fixture.componentInstance.selectTab('near-misses');
    expect(api.getNearMisses).toHaveBeenCalledWith('predictive-run-1', 'actionable', null);
  });

  it('ignores stale panel responses after selecting another run', () => {
    const delayed = new Subject<ReturnType<typeof diagnostics>>();
    api.getDiagnostics.mockReturnValueOnce(delayed);
    const fixture = render(
      runPage([run('run-1', 'ALPHA/USD', '2026-02-01'), run('run-2', 'ALPHA/USD', '2026-01-01')]),
    );
    fixture.componentInstance.selectTab('predictive');
    fixture.componentInstance.selectRun('run-2');
    delayed.next(diagnostics());
    delayed.complete();
    expect(fixture.componentInstance.diagnostics()).toBeNull();
  });

  it('treats targeted 404 as an unavailable legacy state', () => {
    api.getTargetedRefinement.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    const fixture = render();
    fixture.componentInstance.selectTab('targeted');
    fixture.detectChanges();
    expect(fixture.componentInstance.targetedState()).toBe('unavailable');
    expect(text(fixture)).toContain('not available for this legacy');
  });

  it('keeps actionable and diagnostic near misses distinct', () => {
    const fixture = render();
    fixture.componentInstance.selectTab('near-misses');
    fixture.componentInstance.selectNearMissKind('diagnostic');
    expect(api.getNearMisses).toHaveBeenLastCalledWith('predictive-run-1', 'diagnostic', null);
  });

  it('renders diagnostic bottleneck, conclusion and rejection counts', () => {
    const fixture = render();
    fixture.componentInstance.selectTab('predictive');
    fixture.detectChanges();
    expect(text(fixture)).toContain('Near misses found');
    expect(text(fixture)).toContain('Validation');
    expect(text(fixture)).toContain('Insufficient observations');
  });

  it('renders near-miss margins and threshold sensitivity', () => {
    const fixture = render();
    fixture.componentInstance.openNearMiss('near-1');
    fixture.detectChanges();
    expect(api.getNearMiss).toHaveBeenCalledWith('predictive-run-1', 'near-1');
    expect(text(fixture)).toContain('0.48');
    expect(text(fixture)).toContain('0.55');
    expect(text(fixture)).toContain('Threshold sensitivity');
  });

  it('renders exact targeted funnel zeros, all statuses and nullable stages', () => {
    api.getTargetedCandidates.mockReturnValue(of(targetedPage()));
    const fixture = render();
    fixture.componentInstance.selectTab('targeted');
    fixture.detectChanges();
    const content = text(fixture);
    expect(content).toContain('Configurations 4');
    expect(content).toContain('Validation retained 0');
    expect(content).toContain('Not evaluated');
    for (const status of [
      'Rejected training',
      'Rejected validation',
      'Rejected test',
      'Confirmed candidate',
    ])
      expect(content).toContain(status);
  });

  it('uses the predictive identity for targeted filters and detail', () => {
    const fixture = render();
    fixture.componentInstance.selectTab('targeted');
    fixture.componentInstance.selectTargetedStatus('rejected_test');
    expect(api.getTargetedCandidates).toHaveBeenLastCalledWith(
      'predictive-run-1',
      'rejected_test',
      0,
    );
    fixture.componentInstance.openTargetedCandidate('target-1');
    expect(api.getTargetedCandidate).toHaveBeenCalledWith('predictive-run-1', 'target-1');
  });

  it('keeps historical nullable test evidence visible as Not evaluated', () => {
    api.getCandidates.mockReturnValue(
      of({ items: [historicalCandidate()], total: 1, limit: 50, offset: 0 }),
    );
    const fixture = render();
    fixture.componentInstance.selectTab('historical');
    fixture.detectChanges();
    expect(text(fixture)).toContain('Not evaluated');
    expect(api.getCandidate).not.toHaveBeenCalled();
  });

  it('renders accessible button-style workspace tabs', () => {
    const fixture = render();
    const tabs = [...fixture.nativeElement.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
    expect(tabs.map((item) => item.textContent?.trim())).toEqual([
      'Overview',
      'Predictive Evidence',
      'Near Misses',
      'Targeted Refinement',
      'Historical Candidates',
    ]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  function render(page = runPage()) {
    api.getRuns.mockReturnValue(of(page));
    const fixture = TestBed.createComponent(StrategyResearchPage);
    fixture.detectChanges();
    return fixture;
  }
});

function run(id: string, asset = 'GENERIC/USD', completed = '2026-01-01'): EdgeGuidedRun {
  return {
    id,
    predictive_edge_run_id: `predictive-${id}`,
    status: 'completed',
    instrument: { asset, provider: 'venue', market_type: 'spot', interval: '5m' },
    range_start: '2025-01-01T00:00:00Z',
    range_end: '2026-01-01T00:00:00Z',
    fee_rate: '0.001',
    slippage_rate: '0.0005',
    legacy: false,
    generated_count: 4,
    evaluated_count: 3,
    windows_available: 3,
    started_at: `${completed}T00:00:00Z`,
    completed_at: `${completed}T01:00:00Z`,
    candidate_status_counts: { confirmed_candidate: 1, rejected_validation: 1, rejected_test: 1 },
    research_outcome: 'confirmed_candidates_found',
    outcome_explanation: 'Historical evidence only.',
    funnel: null,
    timings: { total: '12.5' },
  };
}
function runPage(items = [run('run-1')]): RunPage {
  return { items, total: items.length, limit: 100, offset: 0 };
}
function diagnostics() {
  return {
    contract_version: 4,
    effective_parameters: [],
    rejection_counts_by_reason: { insufficient_observations: 2 },
    rejection_counts_by_predictor: {},
    rejection_counts_by_horizon: {},
    rejection_counts_by_cadence: {},
    strongest_observed_signal: 'rsi',
    bottleneck_stage: 'validation',
    diagnostic_conclusion: 'near_misses_found',
    outcome_explanation: 'Evidence did not pass every gate.',
    stage_timings: {},
    computed_counts: {},
    reused_counts: {},
    regime_conditioned_conclusion: null,
    regime_conditioned_stage_counters: null,
  };
}
function targetedSummary() {
  return {
    id: 'targeted',
    predictive_edge_run_id: 'predictive-run-1',
    conclusion: 'candidates_rejected_validation',
    summary: {
      configurations_generated: 4,
      training_retained: 2,
      validation_retained: 0,
      test_evaluated: 0,
    },
    confirmed_candidate_count: 0,
    best_targeted_candidate_id: null,
    best_targeted_candidate: null,
  };
}
function targetedPage(): TargetedCandidatePage {
  return {
    items: ['rejected_training', 'rejected_validation', 'rejected_test', 'confirmed_candidate'].map(
      (status, index) => ({
        id: `target-${index}`,
        candidate_fingerprint: `fingerprint-${index}`,
        seed_fingerprint: 'seed',
        status: status as TargetedCandidatePage['items'][number]['status'],
        normalized_distance: '0.1',
        configuration: {
          directional_predictor: 'rsi',
          cadence_seconds: 14400,
          horizon_seconds: 43200,
        },
        training_metrics: index === 0 ? null : metric('training'),
        validation_metrics: index < 2 ? null : metric('validation'),
        test_metrics: index < 3 ? null : metric('test'),
        passed_requirements: [],
        failed_requirements: [],
        requirement_margins: [],
        rejection_reason: null,
      }),
    ),
    total: 4,
    next_cursor: null,
    has_more: false,
  };
}

function nearMissDetail() {
  return {
    near_miss: {
      id: 'near-1',
      rank: 1,
      engine: 'v4.1',
      engine_contract_version: 5,
      kind: 'actionable',
      directional_predictor: 'rsi',
      context_predictor: 'atr',
      context_regime: 'high',
      cadence_seconds: 14400,
      horizon_seconds: 43200,
      suggested_action: 'long_entry',
      classification: 'near_miss',
      primary_rejection_reason: 'directional_hit_rate',
      passed_requirements: ['minimum_observations'],
      failed_requirements: ['directional_hit_rate'],
      requirement_margins: [
        {
          requirement: 'directional_hit_rate',
          observed_value: '0.48',
          required_value: '0.55',
          absolute_margin: '-0.07',
          relative_margin: '-0.127',
          passed: false,
        },
      ],
      usable_observations: 90,
      usable_window_count: 3,
      expected_net_movement: '0.002',
      directional_hit_rate: '0.48',
      benchmark_improvement: '0.01',
      normalized_missing_distance: '0.127',
      training_evidence: null,
      validation_evidence: null,
      test_evidence: null,
    },
    sensitivity: [
      {
        threshold_name: 'directional_hit_rate',
        current_value: '0.55',
        nearest_passing_value: '0.48',
        candidate_would_advance: true,
        other_requirements_still_failed: [],
      },
    ],
  };
}
function metric(segment: 'training' | 'validation' | 'test') {
  return {
    segment,
    total_return: '0.01',
    max_drawdown: '0.02',
    trade_count: 2,
    fees_paid: '1',
    return_difference_from_production: '0.005',
    return_difference_from_buy_and_hold: '0.003',
  };
}
function historicalCandidate() {
  return {
    candidate_evaluation_id: 'candidate',
    run_id: 'run',
    candidate_fingerprint: 'fingerprint',
    source_hypothesis_id: 'hypothesis',
    source_edge_fingerprint: 'edge',
    asset: 'GENERIC/USD',
    provider: 'venue',
    market_type: 'spot',
    interval: '5m',
    dataset_fingerprint: 'dataset',
    range_start: '2025-01-01T00:00:00Z',
    range_end: '2026-01-01T00:00:00Z',
    predictor_name: 'rsi',
    predictor_version: 1,
    hypothesis_contract_version: 1,
    condition: 'all',
    lower_bound: null,
    upper_bound: null,
    suggested_action: 'long_entry' as const,
    horizon_seconds: 3600,
    decision_interval_seconds: 1800,
    direction_mapping: 'positive',
    score_model_name: 'score',
    score_model_version: 1,
    strategy_name: 'strategy',
    strategy_version: 1,
    strategy_configuration_version: 1,
    account_currency: 'USDT',
    fee_rate: '0.001',
    slippage_rate: '0.0005',
    status: 'rejected_validation' as const,
    explanation: 'Evidence',
    unconditional_benchmark: 'benchmark',
    valid_window_count: 3,
    confirmed_window_count: 0,
    rejected_validation_window_count: 3,
    rejected_test_window_count: 0,
    training_metrics: metric('training'),
    validation_metrics: metric('validation'),
    test_metrics: null,
  };
}
function text(fixture: { nativeElement: HTMLElement }): string {
  return (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim();
}
