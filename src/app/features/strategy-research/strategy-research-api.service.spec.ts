import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config';
import { StrategyResearchApiService } from './strategy-research-api.service';

describe('StrategyResearchApiService', () => {
  let service: StrategyResearchApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    service = TestBed.inject(StrategyResearchApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests bounded run evidence', () => {
    service.getRuns().subscribe();
    const request = http.expectOne(
      'https://api.example.test/optimization/edge-guided/runs?limit=100&offset=0',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], total: 0, limit: 100, offset: 0 });
  });

  it('sends complete instrument identity and all candidate filters', () => {
    service
      .getCandidates(
        {
          instrument: {
            asset: 'GENERIC/USD',
            provider: 'provider-one',
            market_type: 'spot',
            interval: '5m',
          },
          status: 'confirmed_candidate',
          action: 'long_entry',
          predictor: 'rsi_14',
          condition: 'high_volatility',
        },
        50,
      )
      .subscribe();
    const request = http.expectOne((item) => {
      const params = item.params;
      return (
        item.url === 'https://api.example.test/optimization/edge-guided/candidates' &&
        params.get('asset') === 'GENERIC/USD' &&
        params.get('provider') === 'provider-one' &&
        params.get('market_type') === 'spot' &&
        params.get('interval') === '5m' &&
        params.get('status') === 'confirmed_candidate' &&
        params.get('action') === 'long_entry' &&
        params.get('predictor_name') === 'rsi_14' &&
        params.get('condition') === 'high_volatility' &&
        params.get('limit') === '50' &&
        params.get('offset') === '50'
      );
    });
    request.flush({ items: [], total: 0, limit: 50, offset: 50 });
  });

  it('loads candidate detail only through the explicit detail request', () => {
    service.getCandidate('candidate/id').subscribe();
    const request = http.expectOne(
      'https://api.example.test/optimization/edge-guided/candidates/candidate%2Fid',
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
