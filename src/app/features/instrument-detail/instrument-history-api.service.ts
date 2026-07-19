import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import {
  DashboardOverview,
  InstrumentDefinition,
  MarketScore,
} from '../dashboard/dashboard.models';
import {
  DecisionSnapshot,
  InstrumentIdentity,
  MarketCandle,
  PaperTrade,
} from './instrument-detail.models';

export interface HistoryRequest extends InstrumentIdentity {
  from: string;
  to: string;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class InstrumentHistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getInstruments(): Observable<InstrumentDefinition[]> {
    return this.http.get<InstrumentDefinition[]>(`${this.baseUrl}/market/instruments`);
  }

  getOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${this.baseUrl}/dashboard/overview`);
  }

  getCandles(request: HistoryRequest): Observable<MarketCandle[]> {
    return this.http.get<MarketCandle[]>(`${this.baseUrl}/market/candles`, {
      params: historyParams(request),
    });
  }

  getScores(request: HistoryRequest): Observable<MarketScore[]> {
    return this.http.get<MarketScore[]>(`${this.baseUrl}/market/scores`, {
      params: historyParams(request),
    });
  }

  getDecisions(request: HistoryRequest): Observable<DecisionSnapshot[]> {
    return this.http.get<DecisionSnapshot[]>(`${this.baseUrl}/market/decisions`, {
      params: historyParams(request),
    });
  }

  getTrades(request: HistoryRequest): Observable<PaperTrade[]> {
    return this.http.get<PaperTrade[]>(`${this.baseUrl}/paper/trades`, {
      params: historyParams(request),
    });
  }
}

function historyParams(request: HistoryRequest): HttpParams {
  return new HttpParams()
    .set('asset', request.asset)
    .set('provider', request.provider)
    .set('market_type', request.market_type)
    .set('interval', request.interval)
    .set('from', request.from)
    .set('to', request.to)
    .set('order', 'asc')
    .set('limit', request.limit);
}
