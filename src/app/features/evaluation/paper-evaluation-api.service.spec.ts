import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config';
import { evaluationFixture } from './evaluation.fixture';
import { PaperEvaluationApiService } from './paper-evaluation-api.service';

describe('PaperEvaluationApiService', () => {
  it('requests the active or explicitly selected Paper Run', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    const service = TestBed.inject(PaperEvaluationApiService);
    const http = TestBed.inject(HttpTestingController);
    service.getEvaluation('run-1').subscribe((value) => expect(value).toEqual(evaluationFixture));
    const request = http.expectOne('https://api.example.test/paper/evaluation?run_id=run-1');
    expect(request.request.method).toBe('GET');
    request.flush(evaluationFixture);
    http.verify();
  });
});
