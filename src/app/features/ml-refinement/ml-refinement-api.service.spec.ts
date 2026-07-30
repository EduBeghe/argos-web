import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config';
import { MlRefinementApiService } from './ml-refinement-api.service';
import { RefinementRequest } from './ml-refinement.models';

describe('MlRefinementApiService', () => {
  let service: MlRefinementApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    service = TestBed.inject(MlRefinementApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads the authoritative contract and all bounded screening pages sequentially', () => {
    service.getContract().subscribe();
    http.expectOne('https://api.example.test/optimization/ml-refinement-contract').flush({});
    let count = 0;
    service.getScreeningRuns().subscribe((items) => (count = items.length));
    http
      .expectOne('https://api.example.test/optimization/ml-screening-runs?limit=200&offset=0')
      .flush({
        items: Array.from({ length: 200 }, (_, id) => ({ id })),
        total: 201,
        limit: 200,
        offset: 0,
        has_more: true,
      });
    http
      .expectOne('https://api.example.test/optimization/ml-screening-runs?limit=200&offset=200')
      .flush({ items: [{ id: 200 }], total: 201, limit: 200, offset: 200, has_more: false });
    expect(count).toBe(201);
  });

  it('encodes identities and covers list, detail, enqueue, cancel and retry contracts', () => {
    service.getScreeningResults('source/id').subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/ml-screening-runs/source%2Fid/results?limit=200&offset=0',
      )
      .flush({ items: [], total: 0, limit: 200, offset: 0, has_more: false });
    service.getRuns().subscribe();
    http
      .expectOne('https://api.example.test/optimization/ml-refinement-runs?limit=200&offset=0')
      .flush({ items: [], total: 0, limit: 200, offset: 0, has_more: false });
    service.getRun('run/id').subscribe();
    http.expectOne('https://api.example.test/optimization/ml-refinement-runs/run%2Fid').flush({});
    const body = { source_screening_run_id: 'a' } as RefinementRequest;
    service.enqueue(body).subscribe();
    const enqueue = http.expectOne('https://api.example.test/optimization/ml-refinement-runs');
    expect(enqueue.request.body).toBe(body);
    enqueue.flush({}, { status: 202, statusText: 'Accepted' });
    service.cancel('run/id').subscribe();
    const cancel = http.expectOne(
      'https://api.example.test/optimization/ml-refinement-runs/run%2Fid/cancel',
    );
    expect(cancel.request.method).toBe('POST');
    cancel.flush({});
    service.retry('run/id').subscribe();
    http
      .expectOne('https://api.example.test/optimization/ml-refinement-runs/run%2Fid/retry')
      .flush({}, { status: 200, statusText: 'OK' });
  });

  it('uses server filters for evaluation pagination and lazy detail', () => {
    service.getEvaluations('run/id', { classification: 'discarded', engine: 'ridge' }).subscribe();
    const list = http.expectOne((request) => request.url.endsWith('/run%2Fid/evaluations'));
    expect(list.request.params.get('classification')).toBe('discarded');
    expect(list.request.params.get('engine')).toBe('ridge');
    list.flush({ items: [], total: 0, limit: 200, offset: 0, has_more: false });
    service.getEvaluation('run/id', 'evaluation/id').subscribe();
    http
      .expectOne(
        'https://api.example.test/optimization/ml-refinement-runs/run%2Fid/evaluations/evaluation%2Fid',
      )
      .flush({});
  });

  it('preserves transport errors for the page to render', () => {
    let status = 0;
    service.getContract().subscribe({ error: (error) => (status = error.status) });
    http
      .expectOne('https://api.example.test/optimization/ml-refinement-contract')
      .flush({ detail: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(status).toBe(503);
  });

  it('terminates malformed pagination when a page is empty despite has_more', () => {
    let result: unknown[] = [];
    service.getRuns().subscribe((items) => (result = items));
    http
      .expectOne('https://api.example.test/optimization/ml-refinement-runs?limit=200&offset=0')
      .flush({ items: [], total: 999, limit: 200, offset: 0, has_more: true });
    expect(result).toEqual([]);
    http.verify();
  });
});
