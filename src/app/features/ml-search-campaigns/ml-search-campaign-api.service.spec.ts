import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config';
import { MlSearchCampaignApiService } from './ml-search-campaign-api.service';

describe('MlSearchCampaignApiService', () => {
  let service: MlSearchCampaignApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    service = TestBed.inject(MlSearchCampaignApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads exactly one campaign page with defined filters and fixed limit 25', () => {
    service
      .getCampaigns(25, { status: 'running', outcome: '', source_screening_run_id: undefined })
      .subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/ml-search-campaigns'));
    expect(request.request.params.keys().sort()).toEqual(['limit', 'offset', 'status']);
    expect(request.request.params.get('limit')).toBe('25');
    expect(request.request.params.get('offset')).toBe('25');
    expect(request.request.params.get('status')).toBe('running');
    request.flush({ items: [], total: 0, offset: 25, limit: 25, has_more: false });
  });

  it('uses exact server family filters, path encoding and fixed visible page limit 50', () => {
    service
      .getFamilies('campaign/id', 50, {
        engine: 'ridge',
        objective: 'future_return_regression',
        feature_strategy: 'top_16',
        minimum_duration_seconds: 1800,
        maximum_duration_seconds: 3600,
        stage: 4,
        state: 'discarded',
      })
      .subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/campaign%2Fid/families'));
    expect(request.request.params.get('feature_strategy')).toBe('top_16');
    expect(request.request.params.get('minimum_duration_seconds')).toBe('1800');
    expect(request.request.params.get('maximum_duration_seconds')).toBe('3600');
    expect(request.request.params.get('stage')).toBe('4');
    expect(request.request.params.get('state')).toBe('discarded');
    expect(request.request.params.get('offset')).toBe('50');
    expect(request.request.params.get('limit')).toBe('50');
    request.flush({ items: [], total: 0, offset: 50, limit: 50, has_more: false });
  });

  it('uses limit 1 for count-only requests without recursively loading another page', () => {
    let total = 0;
    service
      .getFamilies('campaign', 0, { state: 'survived' }, 1)
      .subscribe((page) => (total = page.total));
    const request = http.expectOne((item) => item.url.endsWith('/campaign/families'));
    expect(request.request.params.get('limit')).toBe('1');
    request.flush({ items: [{}], total: 3600, offset: 0, limit: 1, has_more: true });
    expect(total).toBe(3600);
    http.verify();
  });

  it('encodes detail paths and sends empty POST bodies for cancel and retry', () => {
    service.getCampaign('campaign/id').subscribe();
    http
      .expectOne('https://api.example.test/optimization/ml-search-campaigns/campaign%2Fid')
      .flush({});
    service.getFamily('campaign/id', 'family/id').subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/ml-search-campaigns/campaign%2Fid/families/family%2Fid',
      )
      .flush({});
    service.cancel('campaign/id').subscribe();
    const cancel = http.expectOne(
      'https://api.example.test/optimization/ml-search-campaigns/campaign%2Fid/cancel',
    );
    expect(cancel.request.method).toBe('POST');
    expect(cancel.request.body).toEqual({});
    cancel.flush({});
    service.retry('campaign/id').subscribe();
    const retry = http.expectOne(
      'https://api.example.test/optimization/ml-search-campaigns/campaign%2Fid/retry',
    );
    expect(retry.request.body).toEqual({});
    retry.flush({});
  });
});
