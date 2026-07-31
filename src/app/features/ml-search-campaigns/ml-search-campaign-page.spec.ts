import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';

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
const campaignB: SearchCampaign = { ...campaign, id: 'campaign-00000002' };
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
    const pending = new Subject<SearchCampaign>();
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

  it('applies a mutation response only in its unchanged campaign context', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const familyCalls = api.getFamilies.mock.calls.length;
    component.confirmCancel.set(true);
    component.mutate('cancel');
    expect(component.selectedCampaign()?.status).toBe('cancelled');
    expect(component.liveMessage()).toContain('Cancellation accepted');
    expect(api.getFamilies.mock.calls.length).toBeGreaterThan(familyCalls);

    component.selectedCampaign.set({ ...campaign, status: 'failed' });
    component.mutate('retry');
    expect(component.selectedCampaign()?.status).toBe('queued');
    expect(component.liveMessage()).toContain('Retry accepted');
    fixture.destroy();
  });

  it('ignores stale mutation success and error after route selection changes', () => {
    const cancel = new Subject<SearchCampaign>();
    api.cancel.mockReturnValue(cancel.asObservable());
    api.getCampaign.mockImplementation((id: string) =>
      of(id === campaignB.id ? campaignB : campaign),
    );
    const fixture = create();
    const component = fixture.componentInstance;
    component.confirmCancel.set(true);
    component.mutate('cancel');
    params.next(convertToParamMap({ campaignId: campaignB.id }));
    const familyCalls = api.getFamilies.mock.calls.length;
    const detailCalls = api.getCampaign.mock.calls.length;
    cancel.next({ ...campaign, status: 'cancelled' });
    expect(component.selectedCampaign()?.id).toBe(campaignB.id);
    expect(component.liveMessage()).toBe('');
    expect(component.mutationError()).toBe('');
    expect(api.getFamilies.mock.calls.length).toBe(familyCalls);
    expect(api.getCampaign.mock.calls.length).toBe(detailCalls);

    const retry = new Subject<SearchCampaign>();
    api.retry.mockReturnValue(retry.asObservable());
    component.selectedCampaign.set({ ...campaignB, status: 'failed' });
    component.mutate('retry');
    params.next(convertToParamMap({ campaignId: campaign.id }));
    const refreshCalls = api.getCampaign.mock.calls.length;
    retry.error(new HttpErrorResponse({ status: 409, error: { detail: 'old conflict' } }));
    expect(component.mutationError()).toBe('');
    expect(api.getCampaign.mock.calls.length).toBe(refreshCalls);
    fixture.destroy();
  });

  it('resets mutation state at selection boundaries and permits a valid new mutation', () => {
    const mutationA = new Subject<SearchCampaign>();
    const mutationB = new Subject<SearchCampaign>();
    api.cancel
      .mockReturnValueOnce(mutationA.asObservable())
      .mockReturnValueOnce(mutationB.asObservable());
    api.getCampaign.mockImplementation((id: string) =>
      of(id === campaignB.id ? campaignB : campaign),
    );
    const fixture = create();
    const component = fixture.componentInstance;
    component.confirmCancel.set(true);
    component.mutate('cancel');
    expect(component.mutationPending()).toBe(true);
    params.next(convertToParamMap({ campaignId: campaignB.id }));
    expect(component.mutationPending()).toBe(false);
    expect(component.confirmCancel()).toBe(false);
    component.confirmCancel.set(true);
    component.mutate('cancel');
    expect(api.cancel).toHaveBeenCalledTimes(2);
    expect(component.mutationPending()).toBe(true);
    mutationA.next({ ...campaign, status: 'cancelled' });
    expect(component.mutationPending()).toBe(true);
    mutationB.next({ ...campaignB, status: 'cancelled' });
    expect(component.mutationPending()).toBe(false);
    expect(component.selectedCampaign()?.id).toBe(campaignB.id);
    fixture.destroy();
  });

  it.each([
    ['category', (component: MlSearchCampaignPage) => component.setCategory('near')],
    ['subcategory', (component: MlSearchCampaignPage) => component.setSubcategory('3')],
    ['engine', (component: MlSearchCampaignPage) => component.setFamilyFilter('engine', 'ridge')],
    [
      'objective',
      (component: MlSearchCampaignPage) =>
        component.setFamilyFilter('objective', 'future_return_regression'),
    ],
    [
      'feature',
      (component: MlSearchCampaignPage) => component.setFamilyFilter('feature', 'top_16'),
    ],
    [
      'minimum duration',
      (component: MlSearchCampaignPage) => component.setFamilyFilter('minimum', '1800'),
    ],
    [
      'maximum duration',
      (component: MlSearchCampaignPage) => component.setFamilyFilter('maximum', '3600'),
    ],
    ['page', (component: MlSearchCampaignPage) => component.familyPageBy(1)],
  ])('invalidates delayed family detail when %s changes', (_name, change) => {
    const detail = new Subject<SearchCampaignFamily>();
    api.getFamily.mockReturnValue(detail.asObservable());
    const fixture = create();
    const component = fixture.componentInstance;
    component.openFamily(family.id);
    change(component);
    detail.next(family);
    detail.error(new Error('late family error'));
    expect(component.selectedFamily()).toBeNull();
    expect(component.familyDetailState()).toBe('idle');
    expect(component.familyDetailError()).toBe('');
    fixture.destroy();
  });

  it('invalidates delayed family success and error when the campaign route changes', () => {
    const detail = new Subject<SearchCampaignFamily>();
    api.getFamily.mockReturnValue(detail.asObservable());
    api.getCampaign.mockImplementation((id: string) =>
      of(id === campaignB.id ? campaignB : campaign),
    );
    const fixture = create();
    const component = fixture.componentInstance;
    component.openFamily(family.id);
    params.next(convertToParamMap({ campaignId: campaignB.id }));
    detail.next(family);
    detail.error(new Error('late detail error'));
    expect(component.selectedFamily()).toBeNull();
    expect(component.familyDetailState()).toBe('idle');
    expect(component.familyDetailError()).toBe('');
    fixture.destroy();
  });

  it('preserves family detail during same-context polling and lets only the newest detail win', () => {
    const x = new Subject<SearchCampaignFamily>();
    const y = new Subject<SearchCampaignFamily>();
    api.getFamily.mockReturnValueOnce(x.asObservable()).mockReturnValueOnce(y.asObservable());
    const fixture = create();
    const component = fixture.componentInstance;
    component.openFamily('family-x');
    component.openFamily('family-y');
    x.next({ ...family, id: 'family-x' });
    y.next({ ...family, id: 'family-y' });
    expect(component.selectedFamily()?.id).toBe('family-y');
    component.loadFamilies();
    expect(component.selectedFamily()?.id).toBe('family-y');
    fixture.destroy();
  });

  it('renders empty pagination as zero and corrects one stale positive family offset', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.campaignPage.set(page([], 0, 25));
    component.familyPage.set(page([], 0, 50));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.match(/0 of 0/g)).toHaveLength(2);

    api.getFamilies.mockClear();
    api.getFamilies.mockImplementation(
      (_id: string, offset: number, _filters: object, limit = 50) =>
        of(
          offset === 50
            ? { items: [], total: 25, offset: 50, limit, has_more: false }
            : { items: [family], total: 25, offset: 0, limit, has_more: false },
        ),
    );
    component.familyOffset.set(50);
    component.loadFamilies();
    expect(component.familyOffset()).toBe(0);
    expect(api.getFamilies.mock.calls.map((call) => call[1])).toEqual([50, 0]);
    fixture.destroy();
  });

  it('rejects mutation calls that do not match the campaign lifecycle', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.mutate('retry');
    component.selectedCampaign.set({ ...campaign, status: 'completed' });
    component.mutate('cancel');
    component.selectedCampaign.set({ ...campaign, status: 'future_status' });
    component.mutate('cancel');
    component.mutate('retry');
    expect(api.cancel).not.toHaveBeenCalled();
    expect(api.retry).not.toHaveBeenCalled();
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
