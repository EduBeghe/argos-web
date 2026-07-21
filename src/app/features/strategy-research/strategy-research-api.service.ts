import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, Observable, reduce } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import {
  CandidateDetail,
  CandidateFilters,
  CandidatePage,
  RunPage,
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

  private getRunPage(offset: number): Observable<RunPage> {
    return this.http.get<RunPage>(`${this.baseUrl}/optimization/edge-guided/runs`, {
      params: new HttpParams().set('limit', 100).set('offset', offset),
    });
  }
}
