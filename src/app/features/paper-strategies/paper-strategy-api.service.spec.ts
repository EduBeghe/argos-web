import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config';
import { PaperStrategyApiService } from './paper-strategy-api.service';

describe('PaperStrategyApiService', () => {
  let service: PaperStrategyApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    service = TestBed.inject(PaperStrategyApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses bounded cursor pagination and omits undefined filters', () => {
    service
      .list({ status: 'active', include_archived: false, cursor: 'next/value', limit: 50 })
      .subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/paper/deployments'));
    expect(request.request.params.get('status')).toBe('active');
    expect(request.request.params.get('include_archived')).toBe('false');
    expect(request.request.params.get('cursor')).toBe('next/value');
    expect(request.request.params.get('limit')).toBe('50');
    expect(request.request.params.has('strategy_kind')).toBe(false);
    request.flush({ items: [], next_cursor: null, has_more: false });
  });
  it('encodes identifiers and sends empty lifecycle POST bodies', () => {
    service.get('id/value').subscribe();
    http.expectOne('https://api.example.test/paper/deployments/id%2Fvalue').flush({});
    service.mutate('id/value', 'make-primary').subscribe();
    const request = http.expectOne(
      'https://api.example.test/paper/deployments/id%2Fvalue/make-primary',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({});
  });
});
