import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config';
import { InstrumentHistoryApiService } from './instrument-history-api.service';

describe('InstrumentHistoryApiService', () => {
  it.each([
    ['getCandles', '/market/candles'],
    ['getScores', '/market/scores'],
    ['getDecisions', '/market/decisions'],
    ['getTrades', '/paper/trades'],
  ] as const)('requests complete synchronized history through %s', (method, path) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    const service = TestBed.inject(InstrumentHistoryApiService);
    const controller = TestBed.inject(HttpTestingController);

    const response = service[method]({
      asset: 'GENERIC/USD',
      provider: 'generic-provider',
      market_type: 'cash',
      interval: '15m',
      from: '2026-07-18T00:00:00.000Z',
      to: '2026-07-19T00:00:00.000Z',
      limit: 1000,
    }) as Observable<unknown[]>;
    response.subscribe();

    const request = controller.expectOne((candidate) => candidate.url.endsWith(path));
    expect(request.request.params.get('asset')).toBe('GENERIC/USD');
    expect(request.request.params.get('provider')).toBe('generic-provider');
    expect(request.request.params.get('market_type')).toBe('cash');
    expect(request.request.params.get('interval')).toBe('15m');
    expect(request.request.params.get('order')).toBe('asc');
    expect(request.request.params.get('limit')).toBe('1000');
    expect(request.request.params.get('from')).toBe('2026-07-18T00:00:00.000Z');
    expect(request.request.params.get('to')).toBe('2026-07-19T00:00:00.000Z');
    request.flush([]);
    controller.verify();
  });
});
