import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config';
import { PaperHistoryApiService } from './paper-history-api.service';

describe('PaperHistoryApiService', () => {
  it('performs one typed request with the active run and bounded ascending history', () => {
    TestBed.configureTestingModule({
      providers: [
        PaperHistoryApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    const service = TestBed.inject(PaperHistoryApiService);
    const http = TestBed.inject(HttpTestingController);

    service.getEquitySnapshots('run-id').subscribe((snapshots) => expect(snapshots).toEqual([]));

    const request = http.expectOne(
      'https://api.example.test/paper/equity-snapshots?run_id=run-id&order=asc&limit=500',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
    http.verify();
  });
});
