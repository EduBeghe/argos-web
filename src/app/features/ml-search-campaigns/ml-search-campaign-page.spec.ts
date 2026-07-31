import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { MlSearchCampaignApiService } from './ml-search-campaign-api.service';
import {
  CampaignContract,
  Page,
  SearchCampaign,
  SearchCampaignFamily,
} from './ml-search-campaign.models';
import { MlSearchCampaignPage } from './ml-search-campaign-page';

const contract: CampaignContract = {
  preset: 'exhaustive_ohlcv_v1',
  contract_version: 1,
  policy_version: 1,
  classification_version: 1,
  promotion_policy: 'economic_successive_halving_v1',
  engines: ['ridge'],
  future_durations_seconds: [1800, 3600],
  objectives: ['future_return_regression'],
  feature_variants: ['all', 'top_16'],
  stage_trials: [1, 4, 16, 64],
  confidence_buckets: ['0.10'],
  fee_rate: '0.001',
  slippage_rate: '0.0005',
  deterministic_seed: 1729,
  families_per_instrument: 3600,
  default_maximum_evaluations: 3600,
  default_maximum_runtime_seconds: 432000,
};
const campaign: SearchCampaign = {
  id: 'campaign-00000001',
  experiment_key: 'e'.repeat(64),
  status: 'running',
  outcome: null,
  contract_version: 1,
  policy_version: 1,
  classification_version: 1,
  maximum_evaluations: 3600,
  maximum_runtime_seconds: 432000,
  families_total: 3600,
  families_covered: 1200,
  families_uncovered: 2400,
  evaluations_computed: 900,
  evaluations_reused: 300,
  current_stage: 1,
  cancellation_requested_at: null,
  first_claimed_at: '2040-01-01T00:00:00Z',
  completed_at: null,
  failed_at: null,
  failure_type: null,
  failure_message: null,
  created_at: '2040-01-01T00:00:00Z',
};
const family: SearchCampaignFamily = {
  id: 'family-1',
  campaign_id: campaign.id,
  source_screening_run_id: 'source-1',
  fingerprint: 'f'.repeat(64),
  asset: 'GENERIC/USD',
  provider: 'venue',
  market_type: 'spot',
  interval: '5m',
  engine: 'ridge',
  future_duration_seconds: 1800,
  objective: 'future_return_regression',
  feature_variant: 'all',
  state: 'survived',
  current_stage: 2,
  evaluations_planned: 4,
  evaluations_completed: 4,
  evaluations_reused: 0,
  best_evaluation_id: 'evaluation-1',
  best_metrics: {
    observations: 0,
    favorable_direction_folds: 0,
    positive_net_folds: 0,
    folds_beating_benchmark: 0,
    median_net_return: '0',
    worst_net_return: '-0.001',
    promising_configurations: 0,
    complete_and_finite: false,
  },
  decision_reason: 'latest_gate_passed',
  deterministic_ordinal: 17,
};
const page = <T>(items: T[], total = items.length, limit = 50): Page<T> => ({
  items,
  total,
  offset: 0,
  limit,
  has_more: false,
});

describe('MlSearchCampaignPage', () => {
  const params = new BehaviorSubject(convertToParamMap({ campaignId: campaign.id }));
  const api = {
    getContract: vi.fn<() => Observable<CampaignContract>>(),
    getCampaigns: vi.fn(),
    getCampaign: vi.fn(),
    getFamilies: vi.fn(),
    getFamily: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
  };
  const router = { navigate: vi.fn(() => Promise.resolve(true)) };

  beforeEach(() => {
    vi.useRealTimers();
    Object.values(api).forEach((mock) => mock.mockReset());
    router.navigate.mockClear();
    params.next(convertToParamMap({ campaignId: campaign.id }));
    api.getContract.mockReturnValue(of(contract));
    api.getCampaigns.mockReturnValue(of(page([campaign], 1, 25)));
    api.getCampaign.mockReturnValue(of(campaign));
    api.getFamilies.mockImplementation(
      (_id: string, _offset: number, _filters: object, limit = 50) =>
        of(limit === 1 ? page([family], 1, 1) : page([family])),
    );
    api.getFamily.mockReturnValue(of(family));
    api.cancel.mockReturnValue(of({ ...campaign, status: 'cancelled' }));
    api.retry.mockReturnValue(of({ ...campaign, status: 'queued' }));
    TestBed.configureTestingModule({
      imports: [MlSearchCampaignPage],
      providers: [
        { provide: MlSearchCampaignApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
        { provide: Router, useValue: router },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(MlSearchCampaignPage);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the exact direct-linked campaign and renders summary, progress and nullable-safe evidence', () => {
    const fixture = create();
    expect(api.getCampaign).toHaveBeenCalledWith(campaign.id);
    expect(fixture.nativeElement.textContent).toContain('Scientific outcome pending');
    expect(fixture.nativeElement.textContent).toContain('1,200 of 3,600 families');
    expect(fixture.nativeElement.textContent).toContain('Observations: 0');
    expect(fixture.nativeElement.textContent).toContain('Complete and finite: No');
    expect(fixture.nativeElement.textContent).toContain('±0.00%');
    expect(fixture.nativeElement.querySelector('progress').getAttribute('aria-label')).toContain(
      'Family breadth coverage',
    );
    fixture.destroy();
  });

  it('uses authoritative count-only requests and never recursively expands family pages', () => {
    const fixture = create();
    const countCalls = api.getFamilies.mock.calls.filter((call) => call[3] === 1);
    expect(countCalls).toHaveLength(8);
    expect(countCalls.every((call) => call[1] === 0)).toBe(true);
    expect(api.getFamilies.mock.calls.filter((call) => (call[3] ?? 50) === 50)).toHaveLength(1);
    fixture.destroy();
  });

  it('renders an explicit route not-found state without substituting the newest list item', () => {
    api.getCampaign.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Campaign not found');
    expect(router.navigate).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('requires in-page cancellation confirmation and prevents a duplicate pending mutation', () => {
    const pending = new BehaviorSubject<SearchCampaign>(campaign);
    api.cancel.mockReturnValue(pending.asObservable());
    const fixture = create();
    const component = fixture.componentInstance;
    expect(api.cancel).not.toHaveBeenCalled();
    component.confirmCancel.set(true);
    component.mutate('cancel');
    component.mutate('cancel');
    expect(api.cancel).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('polls active detail and visible families at 30 seconds and counts at two minutes', () => {
    vi.useFakeTimers();
    const fixture = create();
    const initialDetail = api.getCampaign.mock.calls.length;
    const initialCounts = api.getFamilies.mock.calls.filter((call) => call[3] === 1).length;
    vi.advanceTimersByTime(30_000);
    expect(api.getCampaign.mock.calls.length).toBe(initialDetail + 1);
    vi.advanceTimersByTime(90_000);
    expect(api.getFamilies.mock.calls.filter((call) => call[3] === 1).length).toBe(
      initialCounts + 8,
    );
    fixture.destroy();
    vi.useRealTimers();
  });
});
