import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import { PaperPortfolioSnapshot } from '../dashboard/dashboard.models';

@Injectable({ providedIn: 'root' })
export class PaperHistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getEquitySnapshots(runId: string): Observable<PaperPortfolioSnapshot[]> {
    const params = new HttpParams().set('run_id', runId).set('order', 'asc').set('limit', 500);
    return this.http.get<PaperPortfolioSnapshot[]>(`${this.apiBaseUrl}/paper/equity-snapshots`, {
      params,
    });
  }
}
