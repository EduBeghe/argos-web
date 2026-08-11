import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import {
  CampaignContract,
  CampaignListFilters,
  DiagnosticQualification,
  DiagnosticQualificationEnqueueResponse,
  DiagnosticQualificationRequest,
  DIAGNOSTIC_QUALIFICATION_PROVENANCE,
  FamilyFilters,
  Page,
  SearchCampaign,
  SearchCampaignFamily,
} from './ml-search-campaign.models';

@Injectable({ providedIn: 'root' })
export class MlSearchCampaignApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getContract(): Observable<CampaignContract> {
    return this.http.get<CampaignContract>(`${this.base}/optimization/ml-search-campaign-contract`);
  }

  getCampaigns(
    offset: number,
    filters: CampaignListFilters = {},
  ): Observable<Page<SearchCampaign>> {
    return this.http.get<Page<SearchCampaign>>(`${this.base}/optimization/ml-search-campaigns`, {
      params: this.params(filters).set('offset', offset).set('limit', 25),
    });
  }

  getCampaign(id: string): Observable<SearchCampaign> {
    return this.http.get<SearchCampaign>(
      `${this.base}/optimization/ml-search-campaigns/${encodeURIComponent(id)}`,
    );
  }

  getFamilies(
    id: string,
    offset: number,
    filters: FamilyFilters = {},
    limit = 50,
  ): Observable<Page<SearchCampaignFamily>> {
    return this.http.get<Page<SearchCampaignFamily>>(
      `${this.base}/optimization/ml-search-campaigns/${encodeURIComponent(id)}/families`,
      { params: this.params(filters).set('offset', offset).set('limit', limit) },
    );
  }

  getFamily(campaignId: string, familyId: string): Observable<SearchCampaignFamily> {
    return this.http.get<SearchCampaignFamily>(
      `${this.base}/optimization/ml-search-campaigns/${encodeURIComponent(campaignId)}/families/${encodeURIComponent(familyId)}`,
    );
  }

  cancel(id: string): Observable<SearchCampaign> {
    return this.http.post<SearchCampaign>(
      `${this.base}/optimization/ml-search-campaigns/${encodeURIComponent(id)}/cancel`,
      {},
    );
  }

  retry(id: string): Observable<SearchCampaign> {
    return this.http.post<SearchCampaign>(
      `${this.base}/optimization/ml-search-campaigns/${encodeURIComponent(id)}/retry`,
      {},
    );
  }

  enqueueDiagnosticQualifications(
    campaignId: string,
    body: DiagnosticQualificationRequest,
  ): Observable<DiagnosticQualificationEnqueueResponse> {
    return this.http.post<DiagnosticQualificationEnqueueResponse>(
      `${this.base}/optimization/ml-search-campaigns/${encodeURIComponent(campaignId)}/diagnostic-qualifications`,
      body,
    );
  }

  getDiagnosticQualifications(
    campaignId: string,
    offset = 0,
    limit = 200,
  ): Observable<Page<DiagnosticQualification>> {
    return this.http.get<Page<DiagnosticQualification>>(
      `${this.base}/optimization/ml-search-campaigns/${encodeURIComponent(campaignId)}/qualifications`,
      {
        params: new HttpParams()
          .set('provenance', DIAGNOSTIC_QUALIFICATION_PROVENANCE)
          .set('offset', offset)
          .set('limit', limit),
      },
    );
  }

  getDiagnosticQualification(
    campaignId: string,
    qualificationId: string,
  ): Observable<DiagnosticQualification> {
    return this.http.get<DiagnosticQualification>(
      `${this.base}/optimization/ml-search-campaigns/${encodeURIComponent(campaignId)}/qualifications/${encodeURIComponent(qualificationId)}`,
    );
  }

  private params(values: object): HttpParams {
    return Object.entries(values).reduce((params, [key, value]) => {
      return value === undefined || value === null || value === ''
        ? params
        : params.set(key, String(value));
    }, new HttpParams());
  }
}
