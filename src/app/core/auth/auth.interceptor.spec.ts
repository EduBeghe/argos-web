import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { API_BASE_URL } from '../config/api-config';
import { authInterceptor } from './auth.interceptor';
import { SessionStore } from './session.store';

describe('authInterceptor', () => {
  const api = 'https://api.example.test';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: api },
      ],
    });
  });

  it('credentials API reads and adds CSRF only to unsafe methods', () => {
    const httpClient = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionStore).authenticate(
      { username: 'admin', role: 'admin', expires_at: '2026-08-01T00:00:00Z' },
      'proof',
    );
    httpClient.get(`${api}/market/instruments`).subscribe();
    const get = controller.expectOne(`${api}/market/instruments`);
    expect(get.request.withCredentials).toBe(true);
    expect(get.request.headers.has('X-CSRF-Token')).toBe(false);
    get.flush({});
    httpClient.post(`${api}/auth/logout`, null).subscribe();
    const post = controller.expectOne(`${api}/auth/logout`);
    expect(post.request.withCredentials).toBe(true);
    expect(post.request.headers.get('X-CSRF-Token')).toBe('proof');
    post.flush(null);
  });

  it('does not credential static, frontend, or malicious-prefix URLs', () => {
    const httpClient = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    for (const url of [
      '/asset.svg',
      'https://web.example.test/data',
      `${api}.attacker.invalid/data`,
    ]) {
      httpClient.get(url).subscribe();
      const request = controller.expectOne(url);
      expect(request.request.withCredentials).toBe(false);
      expect(request.request.headers.has('X-CSRF-Token')).toBe(false);
      request.flush({});
    }
  });

  it.each([
    ['GET', `${api}/dashboard/overview`, 401],
    ['POST', `${api}/paper/runs`, 403],
  ])('clears and redirects for invalid private API evidence', (method, url, status) => {
    const httpClient = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(SessionStore);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    store.authenticate(
      { username: 'admin', role: 'admin', expires_at: '2026-08-01T00:00:00Z' },
      'proof',
    );
    httpClient.request(method, url).subscribe({ error: () => undefined });
    controller.expectOne(url).flush(null, { status, statusText: 'invalid session' });
    expect(store.lifecycle()).toBe('unauthenticated');
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it.each([
    ['POST', `${api}/auth/login`, 401],
    ['GET', `${api}/auth/me`, 401],
    ['POST', `${api}/auth/logout`, 403],
  ])('leaves authentication endpoint failures to AuthService', (method, url, status) => {
    const httpClient = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(SessionStore);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    httpClient.request(method, url).subscribe({ error: () => undefined });
    controller.expectOne(url).flush(null, { status, statusText: 'auth outcome' });
    expect(store.lifecycle()).toBe('checking');
    expect(navigate).not.toHaveBeenCalled();
  });
});
