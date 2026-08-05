import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import {
  CursorPage,
  DeploymentAction,
  DeploymentFilters,
  PaperDeployment,
} from './paper-strategy.models';

@Injectable({ providedIn: 'root' })
export class PaperStrategyApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(filters: DeploymentFilters = {}): Observable<CursorPage<PaperDeployment>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<CursorPage<PaperDeployment>>(`${this.base}/paper/deployments`, {
      params,
    });
  }

  get(id: string): Observable<PaperDeployment> {
    return this.http.get<PaperDeployment>(
      `${this.base}/paper/deployments/${encodeURIComponent(id)}`,
    );
  }

  mutate(id: string, action: DeploymentAction): Observable<PaperDeployment> {
    return this.http.post<PaperDeployment>(
      `${this.base}/paper/deployments/${encodeURIComponent(id)}/${action}`,
      {},
    );
  }
}
