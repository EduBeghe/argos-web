import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config';
import { DashboardApiService } from './dashboard-api.service';
import { dashboardOverview } from './dashboard.fixture';

describe('DashboardApiService', () => {
  it('performs one typed GET against the configured overview URL', () => {
    TestBed.configureTestingModule({
      providers: [
        DashboardApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    const service = TestBed.inject(DashboardApiService);
    const http = TestBed.inject(HttpTestingController);
    let received = null;

    service.getOverview().subscribe((overview) => (received = overview));
    const request = http.expectOne('https://api.example.test/dashboard/overview');
    expect(request.request.method).toBe('GET');
    request.flush(dashboardOverview);
    expect(received).toEqual(dashboardOverview);
    http.verify();
  });
});
