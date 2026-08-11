import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';

import { MlSearchCampaignApiService } from './ml-search-campaign-api.service';
import {
  CampaignContract,
  DiagnosticQualification,
  Page,
  SearchCampaign,
  SearchCampaignFamily,
} from './ml-search-campaign.models';
import { MlSearchCampaignPage } from './ml-search-campaign-page';
import { WorkspaceNavigation } from '../../shared/components/workspace-navigation/workspace-navigation';

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
const diagnosticCampaign: SearchCampaign = {
  ...campaign,
  status: 'completed',
  outcome: 'no_strong_candidate',
  current_stage: 4,
  completed_at: '2040-02-01T00:00:00Z',
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
const nearFamily: SearchCampaignFamily = {
  ...family,
  state: 'discarded',
  current_stage: 3,
  feature_variant: 'top_k_32',
  best_metrics: {
    ...family.best_metrics,
    observations: 150,
    positive_net_folds: 5,
    folds_beating_benchmark: 2,
    median_net_return: '0.012',
  },
};
const qualification: DiagnosticQualification = {
  id: 'qualification-1',
  campaign_id: campaign.id,
  family_id: nearFamily.id,
  candidate_fingerprint: 'c'.repeat(64),
  policy_fingerprint: 'p'.repeat(64),
  qualification_version: 1,
  provenance: 'diagnostic_stage3_near_miss',
  status: 'completed',
  classification: 'qualified',
  engine: 'ridge',
  objective: 'future_return_regression',
  search_track: 'diversified',
  seed_family_id: null,
  frozen_inputs: {},
  temporal_manifest: {},
  temporal_manifest_fingerprint: 't'.repeat(64),
  policy_identity: {},
  scenario_metrics: {
    base: { total_net_return: '0.02' },
    stress_1_5x: { total_net_return: '0.015' },
    stress_2x: { total_net_return: '0.01' },
    maximum_drawdown: '-0.03',
    round_trips: 12,
  },
  quarter_returns: ['0.01', '0.02', '-0.01', '0.03'],
  trades: [{ id: 'trade-1' }],
  failed_rules: [],
  evidence_end_exclusive: '2025-01-01T00:00:00Z',
  completed_at: '2041-01-01T00:00:00Z',
  failed_at: null,
  failure_type: null,
  failure_message: null,
  created_at: '2040-12-01T00:00:00Z',
};
const page = <T>(items: T[], total = items.length, limit = 50): Page<T> => ({
  items,
  total,
  offset: 0,
  limit,
  has_more: false,
});

describe('MlSearchCampaignPage', () => {
  it('identifies list and detail routes as the Automated Search workspace', () => {
    const fixture = create();
    const navigation = fixture.debugElement.query(By.directive(WorkspaceNavigation));

    expect(navigation.componentInstance.currentWorkspace()).toBe('automated-search');
    expect(
      [...navigation.nativeElement.querySelectorAll('a')].map((link: HTMLAnchorElement) =>
        link.getAttribute('href'),
      ),
    ).not.toContain('/ml-search-campaigns');
    fixture.destroy();
  });

  const params = new BehaviorSubject(convertToParamMap({ campaignId: campaign.id }));
  const api = {
    getContract: vi.fn<() => Observable<CampaignContract>>(),
    getCampaigns: vi.fn(),
    getCampaign: vi.fn(),
    getFamilies: vi.fn(),
    getFamily: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    enqueueDiagnosticQualifications: vi.fn(),
    getDiagnosticQualifications: vi.fn(),
    getDiagnosticQualification: vi.fn(),
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
    api.enqueueDiagnosticQualifications.mockReturnValue(
      of({ campaign_id: campaign.id, request_version: 1, items: [] }),
    );
    api.getDiagnosticQualifications.mockReturnValue(of(page([], 0, 100)));
    api.getDiagnosticQualification.mockReturnValue(of(qualification));
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
    expect(fixture.nativeElement.textContent).toContain('Â±0.00%');
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

  it('allows only one family offset correction when totals shrink successively', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const original = new Subject<Page<SearchCampaignFamily>>();
    const correction = new Subject<Page<SearchCampaignFamily>>();
    const responses = [original, correction];
    api.getFamilies.mockClear();
    api.getFamilies.mockImplementation(
      (_id: string, _offset: number, _filters: object, limit = 50) =>
        limit === 1 ? of(page([], 0, 1)) : responses.shift()!.asObservable(),
    );

    component.familyOffset.set(100);
    component.loadFamilies();
    original.next({ items: [], total: 75, offset: 100, limit: 50, has_more: false });
    correction.next({ items: [], total: 25, offset: 50, limit: 50, has_more: false });

    expect(api.getFamilies.mock.calls.map((call) => call[1])).toEqual([100, 50]);
    expect(component.familyOffset()).toBe(50);
    expect(component.familyPage()?.offset).toBe(50);
    expect(component.familyState()).toBe('ready');
    expect(component.paginationLabel(component.familyPage()!)).toBe('0 of 0');
    fixture.destroy();
  });

  it('allows only one campaign offset correction when totals shrink successively', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const original = new Subject<Page<SearchCampaign>>();
    const correction = new Subject<Page<SearchCampaign>>();
    const responses = [original, correction];
    api.getCampaigns.mockClear();
    api.getCampaigns.mockImplementation(() => responses.shift()!.asObservable());

    component.campaignOffset.set(100);
    component.loadCampaigns();
    original.next({ items: [], total: 75, offset: 100, limit: 25, has_more: false });
    correction.next({ items: [], total: 25, offset: 50, limit: 25, has_more: false });

    expect(api.getCampaigns.mock.calls.map((call) => call[0])).toEqual([100, 50]);
    expect(component.campaignOffset()).toBe(50);
    expect(component.campaignPage()?.offset).toBe(50);
    expect(component.campaignListState()).toBe('ready');
    expect(component.paginationLabel(component.campaignPage()!)).toBe('0 of 0');
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

  it('shows launch controls only for completed no-strong-candidate near Stage 3 evidence', () => {
    api.getCampaign.mockReturnValue(of(diagnosticCampaign));
    api.getCampaigns.mockReturnValue(of(page([diagnosticCampaign], 1, 25)));
    api.getFamilies.mockImplementation(
      (_id: string, _offset: number, _filters: object, limit = 50) =>
        of(limit === 1 ? page([nearFamily], 1, 1) : page([nearFamily])),
    );
    const fixture = create();
    const component = fixture.componentInstance;
    component.setCategory('near');
    component.setSubcategory('3');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Run 2024 diagnostic');
    expect(fixture.nativeElement.querySelector('input[type="checkbox"]')).not.toBeNull();
    component.setSubcategory('4');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Run 2024 diagnostic');
    expect(component.diagnosticSelection().size).toBe(0);
    fixture.destroy();
  });

  it('preserves stable unique selection and requires confirmation before one POST', () => {
    api.getCampaign.mockReturnValue(of(diagnosticCampaign));
    api.getCampaigns.mockReturnValue(of(page([diagnosticCampaign], 1, 25)));
    const response = new Subject<{
      campaign_id: string;
      request_version: number;
      items: {
        family_id: string;
        qualification_id: string;
        status: string;
        created: boolean;
        reused: boolean;
      }[];
    }>();
    api.enqueueDiagnosticQualifications.mockReturnValue(response.asObservable());
    const fixture = create();
    const component = fixture.componentInstance;
    component.setCategory('near');
    component.setSubcategory('3');
    component.toggleDiagnosticFamily(nearFamily, true);
    component.toggleDiagnosticFamily(nearFamily, true);
    component.openDiagnosticConfirmation();
    expect(api.enqueueDiagnosticQualifications).not.toHaveBeenCalled();
    component.confirmDiagnostic();
    component.confirmDiagnostic();
    expect(api.enqueueDiagnosticQualifications).toHaveBeenCalledTimes(1);
    expect(api.enqueueDiagnosticQualifications).toHaveBeenCalledWith(diagnosticCampaign.id, {
      family_ids: [nearFamily.id],
    });
    response.next({
      campaign_id: diagnosticCampaign.id,
      request_version: 1,
      items: [
        {
          family_id: nearFamily.id,
          qualification_id: 'qualification-1',
          status: 'queued',
          created: false,
          reused: true,
        },
      ],
    });
    expect(component.diagnosticMessage()).toContain('0 created and 1 reused');
    fixture.destroy();
  });

  it('preserves selections across filters and enforces the ten-family boundary', () => {
    api.getCampaign.mockReturnValue(of(diagnosticCampaign));
    api.getCampaigns.mockReturnValue(of(page([diagnosticCampaign], 1, 25)));
    const fixture = create();
    const component = fixture.componentInstance;
    component.setCategory('near');
    component.setSubcategory('3');
    const families = Array.from({ length: 11 }, (_, index) => ({
      ...nearFamily,
      id: `family-${index + 1}`,
      engine: index % 3 === 0 ? 'ridge' : index % 3 === 1 ? 'lightgbm' : 'catboost',
      future_duration_seconds: [64800, 86400, 172800, 259200][index % 4],
      feature_variant: `top_k_${[16, 32, 64][index % 3]}`,
    }));
    families.slice(0, 10).forEach((item) => component.toggleDiagnosticFamily(item, true));
    component.toggleDiagnosticFamily(families[10], true);
    expect(component.selectedDiagnosticFamilies().map((item) => item.id)).toEqual(
      families.slice(0, 10).map((item) => item.id),
    );
    component.setFamilyFilter('engine', 'ridge');
    expect(component.diagnosticSelection().size).toBe(10);
    component.toggleDiagnosticFamily(families[0], false);
    component.toggleDiagnosticFamily(families[10], true);
    expect(component.selectedDiagnosticFamilies().at(-1)?.id).toBe('family-11');
    fixture.destroy();
  });

  it('stops diagnostic polling on transient failure while preserving the last page', () => {
    vi.useFakeTimers();
    api.getCampaign.mockReturnValue(of(diagnosticCampaign));
    api.getCampaigns.mockReturnValue(of(page([diagnosticCampaign], 1, 25)));
    const running = { ...qualification, status: 'running', classification: null };
    api.getDiagnosticQualifications
      .mockReturnValueOnce(of(page([running], 1, 100)))
      .mockReturnValueOnce(throwError(() => new Error('transient')));
    const fixture = create();
    expect(api.getDiagnosticQualifications).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5_000);
    expect(api.getDiagnosticQualifications).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.diagnosticPage()?.items[0].id).toBe(running.id);
    expect(fixture.componentInstance.diagnosticStale()).toBe(true);
    vi.advanceTimersByTime(15_000);
    expect(api.getDiagnosticQualifications).toHaveBeenCalledTimes(2);
    fixture.destroy();
    vi.useRealTimers();
  });

  it('renders authoritative completed evidence and preserves it after refresh failure', () => {
    api.getCampaign.mockReturnValue(of(diagnosticCampaign));
    api.getCampaigns.mockReturnValue(of(page([diagnosticCampaign], 1, 25)));
    api.getDiagnosticQualifications.mockReturnValueOnce(of(page([qualification], 1, 100)));
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Diagnostic qualified');
    expect(fixture.nativeElement.textContent).toContain('not a strong-candidate designation');
    expect(fixture.nativeElement.textContent).toContain('Completed round trips');
    api.getDiagnosticQualifications.mockReturnValueOnce(throwError(() => new Error('offline')));
    fixture.componentInstance.loadDiagnostics();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Diagnostic qualified');
    expect(fixture.nativeElement.textContent).toContain('Displayed evidence may be stale');
    fixture.destroy();
  });
});
