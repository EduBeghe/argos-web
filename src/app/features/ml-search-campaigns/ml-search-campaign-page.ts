import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, Subscription, timer } from 'rxjs';

import { WorkspaceNavigation } from '../../shared/components/workspace-navigation/workspace-navigation';
import { MlSearchCampaignApiService } from './ml-search-campaign-api.service';
import { ProtectedValidationPanel } from './protected-validation-panel';
import {
  abbreviate,
  CATEGORIES,
  categoryFilters,
  composeCategoryCounts,
  formatDuration,
  formatInteger,
  formatReturn,
  humanize,
  outcomePresentation,
  paginationLabel,
} from './ml-search-campaign.helpers';
import {
  CampaignContract,
  CampaignOutcome,
  CampaignStatus,
  CategoryCounts,
  FamilyCategory,
  FamilyFilters,
  DiagnosticQualification,
  DiagnosticQualificationEnqueueResponse,
  Page,
  SearchCampaign,
  SearchCampaignFamily,
} from './ml-search-campaign.models';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
const ACTIVE = new Set<string>(['queued', 'running']);
const EMPTY_COUNTS: CategoryCounts = {
  strong: null,
  competing: null,
  near: null,
  early: null,
  pending: null,
};

@Component({
  selector: 'app-ml-search-campaign-page',
  imports: [DatePipe, RouterLink, ProtectedValidationPanel, WorkspaceNavigation],
  templateUrl: './ml-search-campaign-page.html',
  styleUrl: './ml-search-campaign-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MlSearchCampaignPage implements OnInit {
  private readonly api = inject(MlSearchCampaignApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private detailPoll?: Subscription;
  private countPoll?: Subscription;
  private listRequest?: Subscription;
  private campaignRequest?: Subscription;
  private familyRequest?: Subscription;
  private countRequest?: Subscription;
  private contractRequest?: Subscription;
  private familyDetailRequest?: Subscription;
  private mutationRequest?: Subscription;
  private diagnosticRequest?: Subscription;
  private diagnosticSubmitRequest?: Subscription;
  private diagnosticPoll?: Subscription;
  private listGeneration = 0;
  private selectionGeneration = 0;
  private familyGeneration = 0;
  private detailGeneration = 0;
  private contractGeneration = 0;
  private countGeneration = 0;
  private mutationGeneration = 0;
  private diagnosticGeneration = 0;
  requestedRouteId: string | null = null;

  readonly categories = CATEGORIES;
  readonly campaignPage = signal<Page<SearchCampaign> | null>(null);
  readonly campaignListState = signal<LoadState>('loading');
  readonly campaignListError = signal('');
  readonly campaignOffset = signal(0);
  readonly statusFilter = signal('');
  readonly outcomeFilter = signal('');
  readonly selectedCampaign = signal<SearchCampaign | null>(null);
  readonly campaignState = signal<LoadState>('idle');
  readonly campaignError = signal('');
  readonly routeNotFound = signal(false);
  readonly contract = signal<CampaignContract | null>(null);
  readonly contractState = signal<LoadState>('loading');
  readonly contractError = signal('');
  readonly category = signal<FamilyCategory>('strong');
  readonly subcategory = signal<number | 'pending' | 'scheduled'>(4);
  readonly categoryCounts = signal<CategoryCounts>(EMPTY_COUNTS);
  readonly countsState = signal<LoadState>('idle');
  readonly countsRefreshedAt = signal<Date | null>(null);
  readonly familyPage = signal<Page<SearchCampaignFamily> | null>(null);
  readonly familyState = signal<LoadState>('idle');
  readonly familyError = signal('');
  readonly familyOffset = signal(0);
  readonly engine = signal('');
  readonly objective = signal('');
  readonly featureVariant = signal('');
  readonly minimumDuration = signal<number | null>(null);
  readonly maximumDuration = signal<number | null>(null);
  readonly selectedFamily = signal<SearchCampaignFamily | null>(null);
  readonly familyDetailState = signal<LoadState>('idle');
  readonly familyDetailError = signal('');
  readonly mutationPending = signal(false);
  readonly confirmCancel = signal(false);
  readonly mutationError = signal('');
  readonly liveMessage = signal('');
  readonly diagnosticSelection = signal<ReadonlyMap<string, SearchCampaignFamily>>(new Map());
  readonly diagnosticPage = signal<Page<DiagnosticQualification> | null>(null);
  readonly diagnosticState = signal<LoadState>('idle');
  readonly diagnosticError = signal('');
  readonly diagnosticStale = signal(false);
  readonly diagnosticConfirmation = signal(false);
  readonly diagnosticSubmitting = signal(false);
  readonly diagnosticSubmitError = signal('');
  readonly diagnosticMessage = signal('');

  readonly diagnosticLaunchEligible = computed(() => {
    const campaign = this.selectedCampaign();
    return (
      campaign?.status === 'completed' &&
      campaign.outcome === 'no_strong_candidate' &&
      this.category() === 'near' &&
      this.subcategory() === 3
    );
  });
  readonly selectedDiagnosticFamilies = computed(() => [...this.diagnosticSelection().values()]);

  readonly outcome = computed(() => outcomePresentation(this.selectedCampaign()?.outcome ?? null));
  readonly categoryDefinition = computed(
    () => CATEGORIES.find((item) => item.id === this.category())?.definition ?? '',
  );
  readonly durationInvalid = computed(() => {
    const minimum = this.minimumDuration();
    const maximum = this.maximumDuration();
    return minimum !== null && maximum !== null && minimum > maximum;
  });
  readonly progress = computed(() => {
    const campaign = this.selectedCampaign();
    return campaign && campaign.families_total > 0
      ? campaign.families_covered / campaign.families_total
      : 0;
  });

  ngOnInit(): void {
    this.loadContract();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.requestedRouteId = params.get('campaignId');
      this.routeNotFound.set(false);
      this.stopPolling();
      this.cancelSelectionRequests();
      this.selectionGeneration += 1;
      this.selectedCampaign.set(null);
      this.resetDiagnosticContext();
      this.loadCampaigns(true);
      if (this.requestedRouteId) this.loadSelectedCampaign(this.requestedRouteId);
    });
    document.addEventListener('visibilitychange', this.visibilityChanged);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', this.visibilityChanged);
      this.stopPolling();
      this.cancelRequests();
    });
  }

  loadContract(): void {
    const generation = ++this.contractGeneration;
    this.contractState.set('loading');
    this.contractRequest?.unsubscribe();
    this.contractRequest = this.api
      .getContract()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => {
          if (generation !== this.contractGeneration) return;
          this.contract.set(value);
          this.contractState.set('ready');
          this.contractError.set('');
        },
        error: () => {
          if (generation !== this.contractGeneration) return;
          this.contractState.set('error');
          this.contractError.set('Campaign filter contract is unavailable.');
        },
      });
  }

  loadCampaigns(selectNewest = false, correctionAllowed = true): void {
    const generation = ++this.listGeneration;
    this.campaignListState.set(this.campaignPage() ? 'ready' : 'loading');
    this.listRequest?.unsubscribe();
    this.listRequest = this.api
      .getCampaigns(this.campaignOffset(), {
        status: this.statusFilter(),
        outcome: this.outcomeFilter(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (generation !== this.listGeneration) return;
          if (correctionAllowed && page.total > 0 && page.items.length === 0 && page.offset > 0) {
            const correctedOffset = Math.floor((page.total - 1) / 25) * 25;
            if (correctedOffset !== page.offset) {
              this.campaignOffset.set(correctedOffset);
              this.loadCampaigns(selectNewest, false);
              return;
            }
          }
          this.campaignPage.set(page);
          this.campaignListState.set('ready');
          this.campaignListError.set('');
          if (selectNewest && !this.requestedRouteId && !this.selectedCampaign() && page.items[0]) {
            void this.selectCampaign(page.items[0].id);
          }
        },
        error: () => {
          if (generation !== this.listGeneration) return;
          this.campaignListState.set('error');
          this.campaignListError.set(
            'Campaign list refresh failed. Previously loaded data is preserved.',
          );
        },
      });
  }

  async selectCampaign(id: string): Promise<void> {
    await this.router.navigate(['/ml-search-campaigns', id]);
  }

  loadSelectedCampaign(id: string, polling = false): void {
    const generation = polling ? this.selectionGeneration : ++this.selectionGeneration;
    if (!polling) this.campaignState.set(this.selectedCampaign() ? 'ready' : 'loading');
    this.campaignRequest?.unsubscribe();
    this.campaignRequest = this.api
      .getCampaign(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (campaign) => {
          if (generation !== this.selectionGeneration || id !== this.requestedRouteId) return;
          const wasActive = ACTIVE.has(this.selectedCampaign()?.status ?? '');
          this.selectedCampaign.set(campaign);
          this.clearDiagnosticSelectionOutsideEligibleView();
          this.campaignState.set('ready');
          this.campaignError.set('');
          this.routeNotFound.set(false);
          if (!polling) {
            this.resetFamilyContext();
            this.loadCounts();
            this.loadFamilies();
            if (campaign.status === 'completed') this.loadDiagnostics();
          } else if (wasActive && !ACTIVE.has(campaign.status)) {
            this.loadCounts();
            this.stopPolling();
          }
          if (!polling) this.configurePolling();
        },
        error: (error: HttpErrorResponse) => {
          if (generation !== this.selectionGeneration || id !== this.requestedRouteId) return;
          if (error.status === 404) this.routeNotFound.set(true);
          this.campaignState.set('error');
          this.campaignError.set(
            error.status === 404
              ? 'Campaign not found.'
              : 'Campaign refresh failed. Previously loaded detail is preserved.',
          );
        },
      });
  }

  loadFamilies(correctionAllowed = true): void {
    const campaign = this.selectedCampaign();
    if (!campaign || this.durationInvalid()) return;
    const generation = ++this.familyGeneration;
    this.familyState.set(this.familyPage() ? 'ready' : 'loading');
    this.familyRequest?.unsubscribe();
    this.familyRequest = this.api
      .getFamilies(campaign.id, this.familyOffset(), this.visibleFamilyFilters())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (generation !== this.familyGeneration || campaign.id !== this.selectedCampaign()?.id)
            return;
          if (correctionAllowed && page.total > 0 && page.items.length === 0 && page.offset > 0) {
            const correctedOffset = Math.floor((page.total - 1) / 50) * 50;
            if (correctedOffset !== page.offset) {
              this.invalidateFamilyDetail();
              this.familyOffset.set(correctedOffset);
              this.loadFamilies(false);
              return;
            }
          }
          this.familyPage.set(page);
          if (this.diagnosticLaunchEligible() && this.diagnosticSelection().size) {
            const refreshedById = new Map(page.items.map((item) => [item.id, item]));
            const reconciled = new Map<string, SearchCampaignFamily>();
            for (const [id, summary] of this.diagnosticSelection()) {
              reconciled.set(id, refreshedById.get(id) ?? summary);
            }
            this.diagnosticSelection.set(reconciled);
          }
          this.familyState.set('ready');
          this.familyError.set('');
        },
        error: () => {
          if (generation !== this.familyGeneration) return;
          this.familyState.set('error');
          this.familyError.set(
            'Family page refresh failed. Previously loaded evidence is preserved.',
          );
        },
      });
  }

  loadCounts(): void {
    const campaign = this.selectedCampaign();
    if (!campaign) return;
    const generation = ++this.countGeneration;
    this.countsState.set(this.categoryCounts() === EMPTY_COUNTS ? 'loading' : 'ready');
    const total = (filters: FamilyFilters) =>
      this.api.getFamilies(campaign.id, 0, filters, 1).pipe(
        map((page) => page.total as number | null),
        catchError(() => of(null)),
      );
    this.countRequest?.unsubscribe();
    this.countRequest = forkJoin({
      strong: total({ state: 'strong_development_candidate' }),
      competing: total({ state: 'survived' }),
      near4: total({ state: 'discarded', stage: 4 }),
      near3: total({ state: 'discarded', stage: 3 }),
      early2: total({ state: 'discarded', stage: 2 }),
      early1: total({ state: 'discarded', stage: 1 }),
      scheduled: total({ state: 'scheduled' }),
      pending: total({ state: 'pending' }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((values) => {
        if (generation !== this.countGeneration || campaign.id !== this.selectedCampaign()?.id)
          return;
        this.categoryCounts.set(composeCategoryCounts(values));
        this.countsState.set(
          Object.values(values).some((value) => value === null) ? 'error' : 'ready',
        );
        this.countsRefreshedAt.set(new Date());
      });
  }

  setCampaignFilter(kind: 'status' | 'outcome', value: string): void {
    if (kind === 'status') this.statusFilter.set(value);
    else this.outcomeFilter.set(value);
    this.campaignOffset.set(0);
    if (
      this.selectedCampaign() &&
      ((this.statusFilter() && this.selectedCampaign()?.status !== this.statusFilter()) ||
        (this.outcomeFilter() && this.selectedCampaign()?.outcome !== this.outcomeFilter()))
    ) {
      this.selectedCampaign.set(null);
      void this.router.navigate(['/ml-search-campaigns']);
    }
    this.loadCampaigns(true);
  }

  campaignPageBy(delta: number): void {
    const next = Math.max(0, this.campaignOffset() + delta * 25);
    this.campaignOffset.set(next);
    this.loadCampaigns();
  }

  setCategory(category: FamilyCategory): void {
    this.invalidateFamilyDetail();
    this.category.set(category);
    this.subcategory.set(
      category === 'near' ? 4 : category === 'early' ? 2 : category === 'pending' ? 'scheduled' : 4,
    );
    this.familyOffset.set(0);
    this.loadFamilies();
    this.clearDiagnosticSelectionOutsideEligibleView();
  }

  setSubcategory(value: string): void {
    this.invalidateFamilyDetail();
    this.subcategory.set(value === 'pending' || value === 'scheduled' ? value : Number(value));
    this.familyOffset.set(0);
    this.loadFamilies();
    this.clearDiagnosticSelectionOutsideEligibleView();
  }

  setFamilyFilter(
    kind: 'engine' | 'objective' | 'feature' | 'minimum' | 'maximum',
    value: string,
  ): void {
    this.invalidateFamilyDetail();
    if (kind === 'engine') this.engine.set(value);
    if (kind === 'objective') this.objective.set(value);
    if (kind === 'feature') this.featureVariant.set(value);
    if (kind === 'minimum') this.minimumDuration.set(value ? Number(value) : null);
    if (kind === 'maximum') this.maximumDuration.set(value ? Number(value) : null);
    this.familyOffset.set(0);
    if (!this.durationInvalid()) this.loadFamilies();
  }

  familyPageBy(delta: number): void {
    this.invalidateFamilyDetail();
    this.familyOffset.set(Math.max(0, this.familyOffset() + delta * 50));
    this.loadFamilies();
  }

  openFamily(id: string): void {
    const campaign = this.selectedCampaign();
    if (!campaign) return;
    this.invalidateFamilyDetail();
    const generation = this.detailGeneration;
    const context = this.familyDetailContext(campaign.id);
    this.familyDetailState.set('loading');
    this.familyDetailRequest = this.api
      .getFamily(campaign.id, id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (family) => {
          if (
            generation !== this.detailGeneration ||
            campaign.id !== this.selectedCampaign()?.id ||
            context !== this.familyDetailContext(campaign.id)
          )
            return;
          this.selectedFamily.set(family);
          this.familyDetailState.set('ready');
          this.familyDetailError.set('');
        },
        error: () => {
          if (
            generation !== this.detailGeneration ||
            campaign.id !== this.selectedCampaign()?.id ||
            context !== this.familyDetailContext(campaign.id)
          )
            return;
          this.familyDetailState.set('error');
          this.familyDetailError.set('Family detail is unavailable.');
        },
      });
  }

  refreshAll(): void {
    this.loadCampaigns();
    const campaign = this.selectedCampaign();
    if (campaign) {
      this.loadSelectedCampaign(campaign.id, true);
      this.loadFamilies();
      this.loadCounts();
      if (campaign.status === 'completed') this.loadDiagnostics();
    }
  }

  mutate(action: 'cancel' | 'retry'): void {
    const campaign = this.selectedCampaign();
    const actionAllowed =
      (action === 'cancel' && (campaign?.status === 'queued' || campaign?.status === 'running')) ||
      (action === 'retry' && campaign?.status === 'failed');
    if (!campaign || !actionAllowed || this.mutationPending()) return;
    const campaignId = campaign.id;
    const routeId = this.requestedRouteId;
    const selectionGeneration = this.selectionGeneration;
    const mutationGeneration = ++this.mutationGeneration;
    this.mutationPending.set(true);
    this.mutationError.set('');
    const request = action === 'cancel' ? this.api.cancel(campaignId) : this.api.retry(campaignId);
    this.mutationRequest = request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (value) => {
        if (
          !this.mutationContextMatches(
            mutationGeneration,
            selectionGeneration,
            routeId,
            campaignId,
          ) ||
          value.id !== campaignId
        )
          return;
        this.selectedCampaign.set(value);
        this.mutationPending.set(false);
        this.confirmCancel.set(false);
        this.liveMessage.set(
          action === 'cancel'
            ? 'Cancellation accepted.'
            : 'Retry accepted; the original runtime clock is preserved.',
        );
        this.loadCounts();
        this.loadFamilies();
        this.configurePolling();
      },
      error: (error: HttpErrorResponse) => {
        if (
          !this.mutationContextMatches(mutationGeneration, selectionGeneration, routeId, campaignId)
        )
          return;
        this.mutationPending.set(false);
        this.mutationError.set(
          error.status === 409
            ? String(error.error?.detail ?? 'Campaign lifecycle conflict.')
            : 'Operation failed. Retry when ready.',
        );
        if (error.status === 409) this.loadSelectedCampaign(campaignId, true);
      },
    });
  }

  abbreviate = abbreviate;
  formatDuration = formatDuration;
  formatInteger = formatInteger;
  formatReturn = formatReturn;
  humanize = humanize;
  paginationLabel = paginationLabel;
  knownStatus(status: string): status is CampaignStatus {
    return ['queued', 'running', 'completed', 'failed', 'cancelled'].includes(status);
  }
  knownOutcome(outcome: string | null): outcome is CampaignOutcome {
    return (
      outcome !== null &&
      [
        'coverage_incomplete',
        'no_strong_candidate',
        'search_budget_exhausted',
        'strong_candidates_found',
      ].includes(outcome)
    );
  }

  diagnosticSelected(id: string): boolean {
    return this.diagnosticSelection().has(id);
  }

  toggleDiagnosticFamily(family: SearchCampaignFamily, selected: boolean): void {
    if (!this.diagnosticLaunchEligible()) return;
    const next = new Map(this.diagnosticSelection());
    if (selected) {
      if (!next.has(family.id) && next.size >= 10) return;
      next.set(family.id, family);
    } else {
      next.delete(family.id);
    }
    this.diagnosticSelection.set(next);
    this.diagnosticConfirmation.set(false);
    this.diagnosticSubmitError.set('');
  }

  diagnosticCheckboxChanged(family: SearchCampaignFamily, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.toggleDiagnosticFamily(family, target.checked);
  }

  clearDiagnosticSelection(): void {
    this.diagnosticSelection.set(new Map());
    this.diagnosticConfirmation.set(false);
    this.diagnosticSubmitError.set('');
  }

  openDiagnosticConfirmation(): void {
    if (!this.diagnosticLaunchEligible() || this.diagnosticSelection().size === 0) return;
    this.diagnosticConfirmation.set(true);
  }

  confirmDiagnostic(): void {
    const campaign = this.selectedCampaign();
    const familyIds = [...new Set(this.diagnosticSelection().keys())];
    if (
      !campaign ||
      !this.diagnosticLaunchEligible() ||
      this.diagnosticSubmitting() ||
      familyIds.length < 1 ||
      familyIds.length > 10
    )
      return;
    const generation = this.diagnosticGeneration;
    this.diagnosticSubmitting.set(true);
    this.diagnosticSubmitError.set('');
    this.diagnosticSubmitRequest = this.api
      .enqueueDiagnosticQualifications(campaign.id, { family_ids: familyIds })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!this.diagnosticContextMatches(generation, campaign.id)) return;
          if (!this.validDiagnosticResponse(response, campaign.id, familyIds)) {
            this.diagnosticSubmitting.set(false);
            this.diagnosticSubmitError.set('The diagnostic service returned an invalid response.');
            return;
          }
          const created = response.items.filter((item) => item.created).length;
          const reused = response.items.filter((item) => item.reused).length;
          this.diagnosticSubmitting.set(false);
          this.diagnosticConfirmation.set(false);
          this.diagnosticMessage.set(
            `Diagnostic accepted: ${created} created and ${reused} reused.`,
          );
          this.loadDiagnostics();
        },
        error: (error: HttpErrorResponse) => {
          if (!this.diagnosticContextMatches(generation, campaign.id)) return;
          this.diagnosticSubmitting.set(false);
          this.diagnosticSubmitError.set(this.diagnosticHttpError(error));
          if (error.status === 409) {
            this.loadSelectedCampaign(campaign.id, true);
            this.loadFamilies();
            this.loadDiagnostics();
          }
        },
      });
  }

  loadDiagnostics(fromPoll = false): void {
    const campaign = this.selectedCampaign();
    if (!campaign || campaign.status !== 'completed') return;
    if (fromPoll && this.diagnosticRequest && !this.diagnosticRequest.closed) return;
    const generation = this.diagnosticGeneration;
    if (!this.diagnosticPage()) this.diagnosticState.set('loading');
    this.diagnosticRequest?.unsubscribe();
    this.diagnosticRequest = this.api
      .getDiagnosticQualifications(campaign.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.diagnosticRequest = undefined;
          if (!this.diagnosticContextMatches(generation, campaign.id)) return;
          const unique = new Map<string, DiagnosticQualification>();
          for (const item of page.items) if (item.id) unique.set(item.id, item);
          this.diagnosticPage.set({ ...page, items: [...unique.values()] });
          this.diagnosticState.set('ready');
          this.diagnosticError.set('');
          this.diagnosticStale.set(false);
          this.configureDiagnosticPolling();
        },
        error: () => {
          this.diagnosticRequest = undefined;
          if (!this.diagnosticContextMatches(generation, campaign.id)) return;
          this.stopDiagnosticPolling();
          this.diagnosticState.set(this.diagnosticPage() ? 'ready' : 'error');
          this.diagnosticStale.set(Boolean(this.diagnosticPage()));
          this.diagnosticError.set(
            this.diagnosticPage()
              ? 'Diagnostic refresh failed. Previously loaded evidence is preserved.'
              : 'Diagnostic qualifications are unavailable.',
          );
        },
      });
  }

  scenarioReturn(item: DiagnosticQualification, key: 'base' | 'stress_1_5x' | 'stress_2x'): string {
    return this.formatReturn(item.scenario_metrics?.[key]?.total_net_return);
  }

  diagnosticClassification(item: DiagnosticQualification): string {
    if (item.classification === 'qualified') return 'Diagnostic qualified';
    if (item.classification === 'rejected') return 'Diagnostic rejected';
    return item.classification ? humanize(item.classification) : 'Not available';
  }

  private visibleFamilyFilters(): FamilyFilters {
    return {
      ...categoryFilters(this.category(), this.subcategory()),
      engine: this.engine(),
      objective: this.objective(),
      feature_strategy: this.featureVariant(),
      minimum_duration_seconds: this.minimumDuration() ?? undefined,
      maximum_duration_seconds: this.maximumDuration() ?? undefined,
    };
  }

  private resetFamilyContext(): void {
    this.invalidateFamilyDetail();
    this.familyOffset.set(0);
    this.familyPage.set(null);
    this.categoryCounts.set(EMPTY_COUNTS);
  }

  private clearDiagnosticSelectionOutsideEligibleView(): void {
    if (!this.diagnosticLaunchEligible()) this.clearDiagnosticSelection();
  }

  private resetDiagnosticContext(): void {
    this.diagnosticRequest?.unsubscribe();
    this.diagnosticSubmitRequest?.unsubscribe();
    this.stopDiagnosticPolling();
    this.diagnosticGeneration += 1;
    this.diagnosticSelection.set(new Map());
    this.diagnosticPage.set(null);
    this.diagnosticState.set('idle');
    this.diagnosticError.set('');
    this.diagnosticStale.set(false);
    this.diagnosticConfirmation.set(false);
    this.diagnosticSubmitting.set(false);
    this.diagnosticSubmitError.set('');
    this.diagnosticMessage.set('');
  }

  private diagnosticContextMatches(generation: number, campaignId: string): boolean {
    return generation === this.diagnosticGeneration && this.selectedCampaign()?.id === campaignId;
  }

  private validDiagnosticResponse(
    response: DiagnosticQualificationEnqueueResponse,
    campaignId: string,
    familyIds: string[],
  ): boolean {
    if (response.campaign_id !== campaignId || !response.items.length) return false;
    const expected = new Set(familyIds);
    const returned = new Set<string>();
    for (const item of response.items) {
      if (!item.family_id || !item.qualification_id || !expected.has(item.family_id)) return false;
      returned.add(item.family_id);
    }
    return returned.size === expected.size;
  }

  private diagnosticHttpError(error: HttpErrorResponse): string {
    const detail = error.error?.detail;
    const safeDetail =
      typeof detail === 'string'
        ? detail
        : typeof detail?.message === 'string'
          ? detail.message
          : typeof detail?.reason_code === 'string'
            ? detail.reason_code
            : typeof detail?.code === 'string'
              ? detail.code
              : '';
    if (error.status === 400 || error.status === 422)
      return safeDetail || 'The diagnostic request is invalid.';
    if (error.status === 404) return safeDetail || 'The campaign or family no longer exists.';
    if (error.status === 409) return safeDetail || 'The campaign or family is no longer eligible.';
    return 'The diagnostic request failed. Retry when ready.';
  }

  private configureDiagnosticPolling(): void {
    this.stopDiagnosticPolling();
    if (
      document.hidden ||
      this.diagnosticError() ||
      !this.diagnosticPage()?.items.some((item) => ACTIVE.has(item.status))
    )
      return;
    this.diagnosticPoll = timer(5_000, 5_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!document.hidden) this.loadDiagnostics(true);
      });
  }

  private stopDiagnosticPolling(): void {
    this.diagnosticPoll?.unsubscribe();
    this.diagnosticPoll = undefined;
  }

  invalidateFamilyDetail(): void {
    this.familyDetailRequest?.unsubscribe();
    this.familyDetailRequest = undefined;
    this.detailGeneration += 1;
    this.selectedFamily.set(null);
    this.familyDetailState.set('idle');
    this.familyDetailError.set('');
  }

  private familyDetailContext(campaignId: string): string {
    return JSON.stringify({
      campaignId,
      category: this.category(),
      subcategory: this.subcategory(),
      filters: this.visibleFamilyFilters(),
      offset: this.familyOffset(),
    });
  }

  private mutationContextMatches(
    mutationGeneration: number,
    selectionGeneration: number,
    routeId: string | null,
    campaignId: string,
  ): boolean {
    return (
      mutationGeneration === this.mutationGeneration &&
      selectionGeneration === this.selectionGeneration &&
      routeId === this.requestedRouteId &&
      campaignId === this.selectedCampaign()?.id
    );
  }

  private invalidateMutation(): void {
    this.mutationRequest?.unsubscribe();
    this.mutationRequest = undefined;
    this.mutationGeneration += 1;
    this.mutationPending.set(false);
    this.confirmCancel.set(false);
    this.mutationError.set('');
    this.liveMessage.set('');
  }

  private configurePolling(): void {
    this.stopPolling();
    if (document.hidden || !ACTIVE.has(this.selectedCampaign()?.status ?? '')) return;
    this.detailPoll = timer(30_000, 30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const campaign = this.selectedCampaign();
        if (campaign && !document.hidden) {
          this.loadSelectedCampaign(campaign.id, true);
          this.loadFamilies();
        }
      });
    this.countPoll = timer(120_000, 120_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadCounts());
  }

  private stopPolling(): void {
    this.detailPoll?.unsubscribe();
    this.countPoll?.unsubscribe();
    this.detailPoll = undefined;
    this.countPoll = undefined;
  }

  private cancelSelectionRequests(): void {
    this.campaignRequest?.unsubscribe();
    this.familyRequest?.unsubscribe();
    this.countRequest?.unsubscribe();
    this.invalidateFamilyDetail();
    this.invalidateMutation();
    this.resetDiagnosticContext();
  }

  private cancelRequests(): void {
    this.cancelSelectionRequests();
    this.listRequest?.unsubscribe();
    this.contractRequest?.unsubscribe();
  }

  private readonly visibilityChanged = (): void => {
    if (document.hidden) {
      this.stopPolling();
      this.stopDiagnosticPolling();
      return;
    }
    const campaign = this.selectedCampaign();
    if (campaign && ACTIVE.has(campaign.status)) {
      this.loadSelectedCampaign(campaign.id, true);
      this.loadFamilies();
    }
    this.configurePolling();
    if (this.diagnosticPage()?.items.some((item) => ACTIVE.has(item.status))) {
      this.loadDiagnostics();
    }
  };
}
