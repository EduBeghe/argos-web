import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, Observable, reduce } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import {
  CandidateDetail,
  CandidateFilters,
  CandidatePage,
  NearMissDetail,
  NearMissKind,
  NearMissPage,
  PredictiveDiagnostics,
  RunPage,
  TargetedCandidateDetail,
  TargetedCandidatePage,
  TargetedCandidateStatus,
  TargetedRefinementSummary,
} from './strategy-research.models';

@Injectable({ providedIn: 'root' })
export class StrategyResearchApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getRuns(): Observable<RunPage> {
    return this.getRunPage(0).pipe(
      expand((page) => {
        const nextOffset = page.offset + page.items.length;
        return page.items.length > 0 && nextOffset < page.total
          ? this.getRunPage(nextOffset)
          : EMPTY;
      }),
      reduce(
        (all, page) => ({
          items: [...all.items, ...page.items],
          total: page.total,
          limit: page.limit,
          offset: 0,
        }),
        { items: [], total: 0, limit: 100, offset: 0 } as RunPage,
      ),
    );
  }

  getDiagnostics(predictiveRunId: string): Observable<PredictiveDiagnostics> {
    return this.http.get<PredictiveDiagnostics>(
      `${this.predictiveRunUrl(predictiveRunId)}/diagnostics`,
    );
  }

  getNearMisses(
    predictiveRunId: string,
    kind: NearMissKind,
    cursor: number | null = null,
    limit = 50,
  ): Observable<NearMissPage> {
    let params = new HttpParams().set('kind', kind).set('limit', limit);
    if (cursor !== null) params = params.set('cursor', cursor);
    return this.http.get<NearMissPage>(`${this.predictiveRunUrl(predictiveRunId)}/near-misses`, {
      params,
    });
  }

  getNearMiss(predictiveRunId: string, nearMissId: string): Observable<NearMissDetail> {
    return this.http.get<NearMissDetail>(
      `${this.predictiveRunUrl(predictiveRunId)}/near-misses/${encodeURIComponent(nearMissId)}`,
    );
  }

  getTargetedRefinement(predictiveRunId: string): Observable<TargetedRefinementSummary> {
    return this.http.get<TargetedRefinementSummary>(
      `${this.predictiveRunUrl(predictiveRunId)}/targeted-refinement`,
    );
  }

  getTargetedCandidates(
    predictiveRunId: string,
    status: TargetedCandidateStatus | null,
    offset: number,
    limit = 50,
  ): Observable<TargetedCandidatePage> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    if (status) params = params.set('status', status);
    return this.http.get<TargetedCandidatePage>(
      `${this.predictiveRunUrl(predictiveRunId)}/targeted-refinement/candidates`,
      { params },
    );
  }

  getTargetedCandidate(
    predictiveRunId: string,
    candidateId: string,
  ): Observable<TargetedCandidateDetail> {
    return this.http.get<TargetedCandidateDetail>(
      `${this.predictiveRunUrl(predictiveRunId)}/targeted-refinement/candidates/${encodeURIComponent(candidateId)}`,
    );
  }

  getCandidates(filters: CandidateFilters, offset: number, limit = 50): Observable<CandidatePage> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    if (filters.instrument) {
      params = params
        .set('asset', filters.instrument.asset)
        .set('provider', filters.instrument.provider)
        .set('market_type', filters.instrument.market_type)
        .set('interval', filters.instrument.interval);
    }
    if (filters.status) params = params.set('status', filters.status);
    if (filters.action) params = params.set('action', filters.action);
    if (filters.predictor) params = params.set('predictor_name', filters.predictor);
    if (filters.condition) params = params.set('condition', filters.condition);
    return this.http.get<CandidatePage>(`${this.baseUrl}/optimization/edge-guided/candidates`, {
      params,
    });
  }

  getCandidate(id: string): Observable<CandidateDetail> {
    return this.http.get<CandidateDetail>(
      `${this.baseUrl}/optimization/edge-guided/candidates/${encodeURIComponent(id)}`,
    );
  }

  private predictiveRunUrl(id: string): string {
    return `${this.baseUrl}/optimization/predictive-edge-runs/${encodeURIComponent(id)}`;
  }

  private getRunPage(offset: number): Observable<RunPage> {
    return this.http.get<RunPage>(`${this.baseUrl}/optimization/edge-guided/runs`, {
      params: new HttpParams().set('limit', 100).set('offset', offset),
    });
  }
}
