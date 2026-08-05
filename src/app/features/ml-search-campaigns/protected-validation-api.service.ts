import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import {
  CampaignFamilyAuditResponse,
  FinalValidationPage,
  FinalValidationResponse,
  PaperDeploymentResponse,
  TemporalManifestResponse,
} from './ml-search-campaign.models';

@Injectable({ providedIn: 'root' })
export class ProtectedValidationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private family(campaignId: string, familyId: string): string {
    return `${this.base}/optimization/ml-search-campaigns/${encodeURIComponent(campaignId)}/families/${encodeURIComponent(familyId)}`;
  }
  audit(campaignId: string, familyId: string): Observable<CampaignFamilyAuditResponse> {
    return this.http.get<CampaignFamilyAuditResponse>(`${this.family(campaignId, familyId)}/audit`);
  }
  reconstruct(campaignId: string, familyId: string): Observable<TemporalManifestResponse> {
    return this.http.post<TemporalManifestResponse>(
      `${this.family(campaignId, familyId)}/development-manifest-reconstructions`,
      {},
    );
  }
  manifest(id: string): Observable<TemporalManifestResponse> {
    return this.http.get<TemporalManifestResponse>(
      `${this.base}/optimization/ml-development-manifest-reconstructions/${encodeURIComponent(id)}`,
    );
  }
  manifestAction(id: string, action: 'retry' | 'cancel'): Observable<TemporalManifestResponse> {
    return this.http.post<TemporalManifestResponse>(
      `${this.base}/optimization/ml-development-manifest-reconstructions/${encodeURIComponent(id)}/${action}`,
      {},
    );
  }
  validations(
    campaignId: string,
    familyId: string,
    cursor?: string,
  ): Observable<FinalValidationPage> {
    let params = new HttpParams()
      .set('campaign_id', campaignId)
      .set('family_id', familyId)
      .set('limit', 50);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<FinalValidationPage>(`${this.base}/optimization/ml-final-validations`, {
      params,
    });
  }
  enqueueValidation(campaignId: string, familyId: string): Observable<FinalValidationResponse> {
    return this.http.post<FinalValidationResponse>(
      `${this.family(campaignId, familyId)}/final-validations`,
      {},
    );
  }
  validation(id: string): Observable<FinalValidationResponse> {
    return this.http.get<FinalValidationResponse>(
      `${this.base}/optimization/ml-final-validations/${encodeURIComponent(id)}`,
    );
  }
  validationAction(id: string, action: 'retry' | 'cancel'): Observable<FinalValidationResponse> {
    return this.http.post<FinalValidationResponse>(
      `${this.base}/optimization/ml-final-validations/${encodeURIComponent(id)}/${action}`,
      {},
    );
  }
  deploy(
    finalValidationId: string,
    displayName: string,
    makePrimary: boolean,
  ): Observable<PaperDeploymentResponse> {
    return this.http.post<PaperDeploymentResponse>(`${this.base}/paper/deployments`, {
      final_validation_id: finalValidationId,
      display_name: displayName.trim(),
      make_primary: makePrimary,
    });
  }
}
