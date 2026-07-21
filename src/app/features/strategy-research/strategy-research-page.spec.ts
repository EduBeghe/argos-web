import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { StrategyResearchApiService } from './strategy-research-api.service';
import { StrategyResearchPage } from './strategy-research-page';
import {
  CandidateDetail,
  CandidateFilters,
  CandidatePage,
  CandidateSummary,
  EdgeGuidedRun,
  RunPage,
  SegmentMetrics,
} from './strategy-research.models';

describe('StrategyResearchPage', () => {
  const api = {
    getRuns: vi.fn(),
    getCandidates: vi.fn(),
    getCandidate: vi.fn(),
  };

  beforeEach(() => {
    api.getRuns.mockReset();
    api.getCandidates.mockReset();
    api.getCandidate.mockReset();
    api.getRuns.mockReturnValue(of(runPage()));
    api.getCandidates.mockReturnValue(of(candidatePage()));
    TestBed.configureTestingModule({
      imports: [StrategyResearchPage],
      providers: [provideRouter([]), { provide: StrategyResearchApiService, useValue: api }],
    });
  });

  it('builds summary and instruments from the complete run result', () => {
    api.getRuns.mockReturnValue(
      of(runPage([run('run-1', 'ALPHA/USD', 4, 1, 2, 1), run('run-101', 'OMEGA/USD', 5, 2, 1, 2)])),
    );
    const fixture = createPage();
    const summary = [...fixture.nativeElement.querySelectorAll('.summary article')].map(
      (item: HTMLElement) => ({
        label: item.querySelector('span')?.textContent.trim(),
        value: item.querySelector('strong')?.textContent.trim(),
      }),
    );
    expect(summary).toEqual([
      { label: 'Evaluation Runs', value: '2' },
      { label: 'Candidates Evaluated', value: '9' },
      { label: 'Confirmed Candidates', value: '3' },
      { label: 'Rejected Candidates', value: '6' },
    ]);
    const instrumentOptions = [...fixture.nativeElement.querySelectorAll('select')[0].options].map(
      (option: HTMLOptionElement) => option.textContent,
    );
    expect(instrumentOptions).toEqual([
      'All instruments',
      'ALPHA/USD · provider-one spot · 5m',
      'OMEGA/USD · provider-one spot · 5m',
    ]);
  });

  it('uses a predictor text input and the complete condition contract', () => {
    const fixture = createPage();
    expect(
      fixture.nativeElement.querySelector('input[placeholder="All predictors"]'),
    ).not.toBeNull();
    expect(
      [...fixture.nativeElement.querySelectorAll('label select')[3].options].map(optionText),
    ).toEqual([
      'All',
      'All',
      'Ema20 above ema50',
      'Ema20 below ema50',
      'High volatility',
      'Normal volatility',
    ]);
    expect(normalizedText(fixture.nativeElement)).not.toContain('Hidden predictor option');
  });

  it('applies filters with complete identity and resets the candidate offset', () => {
    const fixture = createPage(candidatePage([], 120));
    fixture.componentInstance.next();
    expect(lastCandidateCall()[1]).toBe(50);

    fixture.componentInstance.selectInstrument(
      JSON.stringify(['GENERIC/USD', 'provider-one', 'spot', '5m']),
    );
    const [filters, offset] = lastCandidateCall();
    expect(filters.instrument).toEqual({
      asset: 'GENERIC/USD',
      provider: 'provider-one',
      market_type: 'spot',
      interval: '5m',
    });
    expect(offset).toBe(0);
  });

  it('clear filters resets state, controls and performs one unfiltered query', () => {
    const fixture = createPage();
    fixture.componentInstance.selectStatus('confirmed_candidate');
    fixture.componentInstance.selectAction('long_entry');
    fixture.componentInstance.applyFilter('predictor', 'rsi_14');
    fixture.componentInstance.applyFilter('condition', 'high_volatility');
    fixture.detectChanges();
    const callsBeforeClear = api.getCandidates.mock.calls.length;

    fixture.componentInstance.clearFilters();
    fixture.detectChanges();

    expect(api.getCandidates).toHaveBeenCalledTimes(callsBeforeClear + 1);
    expect(lastCandidateCall()).toEqual([
      { instrument: null, status: null, action: null, predictor: '', condition: '' },
      0,
    ]);
    const selects = fixture.nativeElement.querySelectorAll('label select');
    expect(selects[0].value).toBe('');
    expect(selects[1].value).toBe('');
    expect(selects[2].value).toBe('');
    expect(selects[3].value).toBe('');
    expect(fixture.nativeElement.querySelector('input[placeholder="All predictors"]').value).toBe(
      '',
    );
  });

  it('does not load detail with the list and requests exactly one selected candidate', () => {
    api.getCandidate.mockReturnValue(of(candidateDetail()));
    const fixture = createPage();
    expect(api.getCandidate).not.toHaveBeenCalled();

    fixture.nativeElement.querySelector('tbody button').click();
    fixture.detectChanges();

    expect(api.getCandidate).toHaveBeenCalledTimes(1);
    expect(api.getCandidate).toHaveBeenCalledWith('candidate-1');
    expect(fixture.nativeElement.querySelector('.detail-panel')).not.toBeNull();
  });

  it('keeps the candidate list when detail loading fails', () => {
    api.getCandidate.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = createPage();
    fixture.nativeElement.querySelector('tbody button').click();
    fixture.detectChanges();

    expect(normalizedText(fixture.nativeElement)).toContain('Candidate detail could not be loaded');
    expect(fixture.nativeElement.querySelector('tbody tr')).not.toBeNull();
  });

  it('renders missing isolated-test evidence as Not evaluated', () => {
    api.getCandidate.mockReturnValue(of(candidateDetail()));
    const fixture = createPage();
    fixture.nativeElement.querySelector('tbody button').click();
    fixture.detectChanges();
    expect(normalizedText(fixture.nativeElement)).toContain('Not evaluated');
  });

  it('pages candidates forward and backward', () => {
    const fixture = createPage(candidatePage([candidate()], 120));
    const buttons = fixture.nativeElement.querySelectorAll('.pagination button');
    buttons[1].click();
    fixture.detectChanges();
    expect(lastCandidateCall()[1]).toBe(50);
    fixture.nativeElement.querySelectorAll('.pagination button')[0].click();
    fixture.detectChanges();
    expect(lastCandidateCall()[1]).toBe(0);
  });

  it('renders the unfiltered empty state', () => {
    const fixture = createPage(candidatePage([], 0));
    expect(normalizedText(fixture.nativeElement)).toContain(
      'No strategy candidates are available yet',
    );
  });

  it('renders a general error and retries the complete initial load', () => {
    api.getRuns
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
      .mockReturnValueOnce(of(runPage()));
    api.getCandidates
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
      .mockReturnValueOnce(of(candidatePage()));
    const fixture = TestBed.createComponent(StrategyResearchPage);
    fixture.detectChanges();
    expect(normalizedText(fixture.nativeElement)).toContain(
      'Strategy research data could not be loaded',
    );

    fixture.nativeElement.querySelector('.notice button').click();
    fixture.detectChanges();
    expect(normalizedText(fixture.nativeElement)).toContain('Candidate list');
    expect(api.getRuns).toHaveBeenCalledTimes(2);
  });

  function createPage(page = candidatePage()) {
    api.getCandidates.mockReturnValue(of(page));
    const fixture = TestBed.createComponent(StrategyResearchPage);
    fixture.detectChanges();
    return fixture;
  }

  function lastCandidateCall(): [CandidateFilters, number] {
    return api.getCandidates.mock.calls.at(-1) as [CandidateFilters, number];
  }
});

function run(
  id: string,
  asset = 'GENERIC/USD',
  evaluated = 3,
  confirmed = 1,
  validationRejected = 1,
  testRejected = 1,
): EdgeGuidedRun {
  return {
    id,
    instrument: { asset, provider: 'provider-one', market_type: 'spot', interval: '5m' },
    evaluated_count: evaluated,
    candidate_status_counts: {
      confirmed_candidate: confirmed,
      rejected_validation: validationRejected,
      rejected_test: testRejected,
    },
  };
}

function runPage(items = [run('run-1')]): RunPage {
  return { items, total: items.length, limit: 100, offset: 0 };
}

function metrics(segment: SegmentMetrics['segment']): SegmentMetrics {
  return {
    segment,
    total_return: '0.0125',
    max_drawdown: '0.01',
    trade_count: 3,
    fees_paid: '2.50',
    return_difference_from_production: '0.0025',
    return_difference_from_buy_and_hold: '0.0015',
  };
}

function candidate(): CandidateSummary {
  return {
    candidate_evaluation_id: 'candidate-1',
    run_id: 'run-1',
    candidate_fingerprint: 'candidate-fingerprint',
    source_hypothesis_id: 'hypothesis-1',
    source_edge_fingerprint: 'edge-fingerprint',
    asset: 'GENERIC/USD',
    provider: 'provider-one',
    market_type: 'spot',
    interval: '5m',
    dataset_fingerprint: 'dataset-fingerprint',
    range_start: '2026-01-01T00:00:00Z',
    range_end: '2026-06-01T00:00:00Z',
    predictor_name: 'visible_predictor',
    predictor_version: 1,
    hypothesis_contract_version: 1,
    condition: 'high_volatility',
    lower_bound: '10',
    upper_bound: '20',
    suggested_action: 'long_entry',
    horizon_seconds: 1800,
    decision_interval_seconds: 1800,
    direction_mapping: 'low_is_positive',
    score_model_name: 'baseline_technical',
    score_model_version: 1,
    strategy_name: 'baseline_long_only',
    strategy_version: 1,
    strategy_configuration_version: 1,
    account_currency: 'USDT',
    fee_rate: '0.001',
    slippage_rate: '0.0005',
    status: 'confirmed_candidate',
    explanation: 'Confirmed historical evidence.',
    unconditional_benchmark: '0.50',
    valid_window_count: 1,
    confirmed_window_count: 1,
    rejected_validation_window_count: 0,
    rejected_test_window_count: 0,
    training_metrics: metrics('training'),
    validation_metrics: metrics('validation'),
    test_metrics: metrics('test'),
  };
}

function candidatePage(items = [candidate()], total = items.length): CandidatePage {
  return { items, total, limit: 50, offset: 0 };
}

function candidateDetail(): CandidateDetail {
  return {
    ...candidate(),
    windows: [
      {
        window_ordinal: 1,
        volatility_threshold: '0.02',
        training_metrics: metrics('training'),
        validation_metrics: metrics('validation'),
        test_metrics: null,
        validation_passed: true,
        test_confirmed: false,
      },
    ],
  };
}

function normalizedText(root: HTMLElement): string {
  return root.textContent.replace(/\s+/g, ' ').trim();
}

function optionText(option: HTMLOptionElement): string {
  return option.textContent.trim();
}
