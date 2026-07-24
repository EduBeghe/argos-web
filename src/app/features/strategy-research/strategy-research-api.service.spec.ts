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

  it('loads all run pages sequentially', () => {
    let count = 0;
    service.getRuns().subscribe((value) => (count = value.items.length));
    http
      .expectOne('https://api.example.test/optimization/edge-guided/runs?limit=100&offset=0')
      .flush({
        items: Array.from({ length: 100 }, (_, id) => ({ id })),
        total: 101,
        limit: 100,
        offset: 0,
      });
    http
      .expectOne('https://api.example.test/optimization/edge-guided/runs?limit=100&offset=100')
      .flush({ items: [{ id: 100 }], total: 101, limit: 100, offset: 100 });
    expect(count).toBe(101);
  });

  it('uses the predictive run identity for diagnostics and near misses', () => {
    service.getDiagnostics('predictive/id').subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/predictive-edge-runs/predictive%2Fid/diagnostics',
      )
      .flush({});
    service.getNearMisses('predictive/id', 'diagnostic', 50).subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/predictive-edge-runs/predictive%2Fid/near-misses?kind=diagnostic&limit=50&cursor=50',
      )
      .flush({ items: [], next_cursor: null, has_more: false });
    service.getNearMiss('predictive/id', 'near/id').subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/predictive-edge-runs/predictive%2Fid/near-misses/near%2Fid',
      )
      .flush({});
  });

  it('uses exact targeted summary, filtering, pagination and detail contracts', () => {
    service.getTargetedRefinement('predictive').subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/predictive-edge-runs/predictive/targeted-refinement',
      )
      .flush({});
    service.getTargetedCandidates('predictive', 'rejected_validation', 50).subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/predictive-edge-runs/predictive/targeted-refinement/candidates?limit=50&offset=50&status=rejected_validation',
      )
      .flush({ items: [], total: 0, next_cursor: null, has_more: false });
    service.getTargetedCandidate('predictive', 'candidate/id').subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/predictive-edge-runs/predictive/targeted-refinement/candidates/candidate%2Fid',
      )
      .flush({});
  });

  it('preserves complete identity filters for historical candidates', () => {
    service
      .getCandidates(
        {
          instrument: {
            asset: 'GENERIC/USD',
            provider: 'venue',
            market_type: 'spot',
            interval: '5m',
          },
          status: 'confirmed_candidate',
          action: 'long_entry',
          predictor: 'rsi',
          condition: 'all',
        },
        50,
      )
      .subscribe();
    const request = http.expectOne((item) =>
      item.url.endsWith('/optimization/edge-guided/candidates'),
    );
    expect(request.request.params.keys().sort()).toEqual(
      [
        'action',
        'asset',
        'condition',
        'interval',
        'limit',
        'market_type',
        'offset',
        'predictor_name',
        'provider',
        'status',
      ].sort(),
    );
    expect(request.request.params.get('asset')).toBe('GENERIC/USD');
    request.flush({ items: [], total: 0, limit: 50, offset: 50 });
  });
});
