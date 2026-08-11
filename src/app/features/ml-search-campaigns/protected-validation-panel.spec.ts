import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';

import {
  CampaignFamilyAuditResponse,
  FinalValidationPage,
  SearchCampaignFamily,
  TemporalManifestResponse,
} from './ml-search-campaign.models';
import { ProtectedValidationApiService } from './protected-validation-api.service';
import { ProtectedValidationPanel } from './protected-validation-panel';

const family = (id = 'family-1'): SearchCampaignFamily => ({
  id,
  campaign_id: 'campaign-1',
  source_screening_run_id: 'screening-1',
  fingerprint: 'f'.repeat(64),
  preset: 'economic_policy_search_v2',
  asset: 'GENERIC/USD',
  provider: 'venue',
  market_type: 'spot',
  interval: '5m',
  engine: 'ridge',
  future_duration_seconds: 1800,
  objective: 'future_return_regression',
  feature_variant: 'all',
  state: 'strong_development_candidate',
  current_stage: 4,
  evaluations_planned: 64,
  evaluations_completed: 64,
  evaluations_reused: 0,
  best_evaluation_id: 'evaluation-1',
  best_metrics: null,
  selected_policy: null,
  selected_policy_fingerprint: null,
  decision_reason: 'strong_candidate',
  deterministic_ordinal: 1,
});

const audit: CampaignFamilyAuditResponse = {
  campaign_id: 'campaign-1',
  family_id: 'family-1',
  evidence_integrity: { valid: true, failure_codes: [] },
  temporal_provenance_integrity: {
    valid: true,
    failure_codes: [],
    provenance_strength: 'complete_reconstruction',
  },
  overall_valid: true,
  reconstructed_manifest_id: null,
  winning_evaluation: { id: 'evaluation-1' },
  winning_configuration: { engine: 'ridge' },
  independent_sample_diagnostic: null,
};

const manifest: TemporalManifestResponse = {
  id: 'manifest-1',
  status: 'completed',
  source: 'reconstructed',
  manifest_fingerprint: 'a'.repeat(64),
  fingerprint_verified: true,
  counts_verified: true,
  failure_code: null,
  failure_message: null,
  created_at: '2026-01-01T00:00:00Z',
  completed_at: '2026-01-01T00:01:00Z',
};

const auditWithManifest: CampaignFamilyAuditResponse = {
  ...audit,
  reconstructed_manifest_id: manifest.id,
};

describe('ProtectedValidationPanel', () => {
  const emptyValidations: FinalValidationPage = { items: [], next_cursor: null, has_more: false };
  const api = {
    audit: vi.fn<() => Observable<CampaignFamilyAuditResponse>>(),
    reconstruct: vi.fn<() => Observable<TemporalManifestResponse>>(),
    manifest: vi.fn(),
    manifestAction: vi.fn(),
    validations: vi.fn(),
    enqueueValidation: vi.fn(),
    validation: vi.fn(),
    validationAction: vi.fn(),
    deploy: vi.fn(),
  };

  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    api.audit.mockReturnValue(of(audit));
    api.validations.mockReturnValue(of(emptyValidations));
    api.reconstruct.mockReturnValue(of(manifest));
    TestBed.configureTestingModule({
      imports: [ProtectedValidationPanel],
      providers: [{ provide: ProtectedValidationApiService, useValue: api }, provideRouter([])],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(ProtectedValidationPanel);
    fixture.componentRef.setInput('campaignId', 'campaign-1');
    fixture.componentRef.setInput('family', family());
    fixture.detectChanges();
    return fixture;
  }

  it('renders the backend audit shape without invented aliases', () => {
    const fixture = create();
    fixture.componentInstance.open();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('complete_reconstruction');
    expect(fixture.nativeElement.textContent).toContain('Winning evaluation: Available');
    expect(fixture.nativeElement.textContent).toContain('Winning configuration: Available');
    fixture.destroy();
  });

  it('keeps manifest existence unresolved until identified detail is available', () => {
    const pending = new Subject<TemporalManifestResponse>();
    api.audit.mockReturnValue(of(auditWithManifest));
    api.manifest.mockReturnValue(pending.asObservable());
    const fixture = create();
    fixture.componentInstance.open();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading temporal manifest…');
    expect(fixture.nativeElement.textContent).not.toContain('No temporal manifest exists.');
    expect(fixture.nativeElement.textContent).not.toContain('Reconstruct temporal provenance');

    pending.next(manifest);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Completed');
    expect(fixture.nativeElement.textContent).toContain(manifest.manifest_fingerprint);
    expect(fixture.nativeElement.textContent).toContain('Fingerprint verified');
    expect(fixture.nativeElement.textContent).toContain('Counts verified');
    fixture.destroy();
  });

  it('shows manifest detail failure with Refresh and never offers reconstruction', () => {
    const pending = new Subject<TemporalManifestResponse>();
    api.audit.mockReturnValue(of(auditWithManifest));
    api.manifest.mockReturnValue(pending.asObservable());
    const fixture = create();
    fixture.componentInstance.open();
    pending.error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Temporal manifest detail is unavailable.');
    expect(fixture.nativeElement.textContent).toContain('Refresh');
    expect(fixture.nativeElement.textContent).not.toContain('No temporal manifest exists.');
    expect(fixture.nativeElement.textContent).not.toContain('Reconstruct temporal provenance');
    fixture.destroy();
  });

  it('offers reconstruction only after the audit confirms manifest absence', () => {
    const fixture = create();
    fixture.componentInstance.open();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No temporal manifest exists.');
    expect(fixture.nativeElement.textContent).toContain('Reconstruct temporal provenance');
    fixture.destroy();
  });

  it('clears a previous absence while a refreshed audit remains pending', () => {
    const delayedAudit = new Subject<CampaignFamilyAuditResponse>();
    const fixture = create();
    const component = fixture.componentInstance;
    component.open();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No temporal manifest exists.');

    api.audit.mockReturnValueOnce(delayedAudit.asObservable());
    component.refresh();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading temporal manifest…');
    expect(fixture.nativeElement.textContent).not.toContain('No temporal manifest exists.');
    expect(fixture.nativeElement.textContent).not.toContain('Reconstruct temporal provenance');
    fixture.destroy();
  });

  it('ignores stale manifest detail after a newer audit confirms absence', () => {
    const staleDetail = new Subject<TemporalManifestResponse>();
    api.audit.mockReturnValueOnce(of(auditWithManifest));
    api.manifest.mockReturnValue(staleDetail.asObservable());
    const fixture = create();
    const component = fixture.componentInstance;
    component.open();
    expect(component.manifestPresentation().status).toBe('loading');

    api.audit.mockReturnValueOnce(of(audit));
    component.refresh();
    expect(component.manifestPresentation().status).toBe('absent');
    staleDetail.next(manifest);
    fixture.detectChanges();
    expect(component.manifestPresentation().status).toBe('absent');
    expect(component.manifest()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No temporal manifest exists.');
    fixture.destroy();
  });

  it('keeps refresh disabled during mutation and clears pending on success', () => {
    const pending = new Subject<TemporalManifestResponse>();
    api.reconstruct.mockReturnValue(pending.asObservable());
    const fixture = create();
    const component = fixture.componentInstance;
    component.open();
    component.reconstruct();
    fixture.detectChanges();
    const refresh = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent?.trim() === 'Refresh',
    );
    expect(refresh?.disabled).toBe(true);
    component.refresh();
    expect(api.audit).toHaveBeenCalledTimes(1);
    pending.next(manifest);
    expect(component.pending()).toBe(false);
    fixture.destroy();
  });

  it('cancels mutation state on family change and ignores the old response', () => {
    const pending = new Subject<TemporalManifestResponse>();
    api.reconstruct.mockReturnValue(pending.asObservable());
    const fixture = create();
    const component = fixture.componentInstance;
    component.reconstruct();
    expect(component.pending()).toBe(true);
    fixture.componentRef.setInput('family', family('family-2'));
    fixture.detectChanges();
    expect(component.pending()).toBe(false);
    expect(component.confirmation()).toBeNull();
    pending.next(manifest);
    expect(component.manifest()).toBeNull();
    fixture.destroy();
  });

  it('clears pending for structured failure and refreshes authority after conflict', () => {
    const structured = new Subject<TemporalManifestResponse>();
    api.reconstruct.mockReturnValueOnce(structured.asObservable());
    const fixture = create();
    const component = fixture.componentInstance;
    component.reconstruct();
    structured.error(
      new HttpErrorResponse({ status: 422, error: { detail: { code: 'invalid', message: 'No' } } }),
    );
    expect(component.pending()).toBe(false);
    expect(component.mutationError()).toBe('invalid: No');

    const conflict = new Subject<TemporalManifestResponse>();
    api.reconstruct.mockReturnValueOnce(conflict.asObservable());
    component.reconstruct();
    const audits = api.audit.mock.calls.length;
    conflict.error(new HttpErrorResponse({ status: 409, error: { detail: 'Conflict' } }));
    expect(component.pending()).toBe(false);
    expect(api.audit.mock.calls.length).toBe(audits + 1);
    fixture.destroy();
  });

  it('unsubscribes and clears mutation state on teardown', () => {
    const pending = new Subject<TemporalManifestResponse>();
    api.reconstruct.mockReturnValue(pending.asObservable());
    const fixture = create();
    const component = fixture.componentInstance;
    component.reconstruct();
    fixture.destroy();
    expect(component.pending()).toBe(false);
    expect(pending.observed).toBe(false);
  });
});
