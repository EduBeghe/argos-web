import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config';
import { ProtectedValidationApiService } from './protected-validation-api.service';

describe('ProtectedValidationApiService', () => {
  let service: ProtectedValidationApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    service = TestBed.inject(ProtectedValidationApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses encoded family audit and empty reconstruction POST', () => {
    service.audit('campaign/id', 'family/id').subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/ml-search-campaigns/campaign%2Fid/families/family%2Fid/audit',
      )
      .flush({});
    service.reconstruct('campaign/id', 'family/id').subscribe();
    const request = http.expectOne(
      'https://api.example.test/optimization/ml-search-campaigns/campaign%2Fid/families/family%2Fid/development-manifest-reconstructions',
    );
    expect(request.request.body).toEqual({});
    request.flush({});
  });
  it('uses cursor pagination and exact family filters for validations', () => {
    service.validations('campaign/id', 'family/id', 'cursor/value').subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/ml-final-validations'));
    expect(request.request.params.get('campaign_id')).toBe('campaign/id');
    expect(request.request.params.get('family_id')).toBe('family/id');
    expect(request.request.params.get('cursor')).toBe('cursor/value');
    expect(request.request.params.get('limit')).toBe('50');
    request.flush({ items: [], next_cursor: null, has_more: false });
  });
  it('uses exact work actions and deployment payload', () => {
    service.manifestAction('manifest/id', 'retry').subscribe();
    let request = http.expectOne(
      'https://api.example.test/optimization/ml-development-manifest-reconstructions/manifest%2Fid/retry',
    );
    expect(request.request.body).toEqual({});
    request.flush({});
    service.validationAction('validation/id', 'cancel').subscribe();
    request = http.expectOne(
      'https://api.example.test/optimization/ml-final-validations/validation%2Fid/cancel',
    );
    expect(request.request.body).toEqual({});
    request.flush({});
    service.deploy('validation/id', '  Winner  ', true).subscribe();
    request = http.expectOne('https://api.example.test/paper/deployments');
    expect(request.request.body).toEqual({
      final_validation_id: 'validation/id',
      display_name: 'Winner',
      make_primary: true,
    });
    request.flush({});
  });
});
