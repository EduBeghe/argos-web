import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import { PaperEvaluationResponse } from './paper-evaluation.models';

@Injectable({ providedIn: 'root' })
export class PaperEvaluationApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getEvaluation(runId?: string): Observable<PaperEvaluationResponse> {
    const params = runId ? new HttpParams().set('run_id', runId) : undefined;
    return this.http.get<PaperEvaluationResponse>(`${this.apiBaseUrl}/paper/evaluation`, {
      params,
    });
  }
}
