import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import {
  EnqueueResponse,
  Page,
  RefinementContract,
  RefinementEvaluation,
  RefinementEvaluationDetail,
  RefinementRequest,
  RefinementRun,
  ScreeningResult,
  ScreeningRun,
} from './ml-refinement.models';

@Injectable({ providedIn: 'root' })
export class MlRefinementApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getContract(): Observable<RefinementContract> {
    return this.http.get<RefinementContract>(`${this.base}/optimization/ml-refinement-contract`);
  }

  getScreeningRuns(): Observable<ScreeningRun[]> {
    return this.allPages<ScreeningRun>(`${this.base}/optimization/ml-screening-runs`);
  }

  getScreeningResults(runId: string): Observable<ScreeningResult[]> {
    return this.allPages<ScreeningResult>(
      `${this.base}/optimization/ml-screening-runs/${encodeURIComponent(runId)}/results`,
    );
  }

  getRuns(): Observable<RefinementRun[]> {
    return this.allPages<RefinementRun>(`${this.base}/optimization/ml-refinement-runs`);
  }

  getRun(id: string): Observable<{ run: RefinementRun }> {
    return this.http.get<{ run: RefinementRun }>(
      `${this.base}/optimization/ml-refinement-runs/${encodeURIComponent(id)}`,
    );
  }

  enqueue(body: RefinementRequest): Observable<EnqueueResponse> {
    return this.http.post<EnqueueResponse>(`${this.base}/optimization/ml-refinement-runs`, body);
  }

  cancel(id: string): Observable<RefinementRun> {
    return this.http.post<RefinementRun>(
      `${this.base}/optimization/ml-refinement-runs/${encodeURIComponent(id)}/cancel`,
      {},
    );
  }

  retry(id: string): Observable<EnqueueResponse> {
    return this.http.post<EnqueueResponse>(
      `${this.base}/optimization/ml-refinement-runs/${encodeURIComponent(id)}/retry`,
      {},
    );
  }

  getEvaluations(
    id: string,
    filters: Record<string, string> = {},
  ): Observable<RefinementEvaluation[]> {
    return this.allPages<RefinementEvaluation>(
      `${this.base}/optimization/ml-refinement-runs/${encodeURIComponent(id)}/evaluations`,
      filters,
    );
  }

  getEvaluation(runId: string, id: string): Observable<RefinementEvaluationDetail> {
    return this.http.get<RefinementEvaluationDetail>(
      `${this.base}/optimization/ml-refinement-runs/${encodeURIComponent(runId)}/evaluations/${encodeURIComponent(id)}`,
    );
  }

  private allPages<T>(url: string, filters: Record<string, string> = {}): Observable<T[]> {
    const page = (offset: number) =>
      this.http.get<Page<T>>(url, {
        params: Object.entries(filters).reduce(
          (params, [key, value]) => params.set(key, value),
          new HttpParams().set('limit', 200).set('offset', offset),
        ),
      });
    return page(0).pipe(
      map((response) => ({ response, requestedOffset: 0, seenOffsets: new Set([0]) })),
      expand((state) => {
        const { response, requestedOffset, seenOffsets } = state;
        const nextOffset = requestedOffset + response.items.length;
        const more = response.has_more || nextOffset < response.total;
        if (!more || response.items.length === 0 || seenOffsets.has(nextOffset)) return EMPTY;
        const nextSeen = new Set(seenOffsets).add(nextOffset);
        return page(nextOffset).pipe(
          map((nextResponse) => ({
            response: nextResponse,
            requestedOffset: nextOffset,
            seenOffsets: nextSeen,
          })),
        );
      }),
      reduce((items, state) => [...items, ...state.response.items], [] as T[]),
    );
  }
}
