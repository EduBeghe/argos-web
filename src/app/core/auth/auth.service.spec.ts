import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api-config';
import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

const API = 'https://api.example.test';
const PRINCIPAL = { username: 'admin', role: 'admin', expires_at: '2026-08-01T00:00:00Z' };

describe('AuthService', () => {
  let service: AuthService;
  let store: SessionStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    service = TestBed.inject(AuthService);
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts checking with no principal or CSRF proof', () => {
    expect(store.lifecycle()).toBe('checking');
    expect(store.principal()).toBeNull();
    expect(store.csrfToken()).toBeNull();
  });

  it('shares one restoration request and stores validated response evidence', async () => {
    const first = firstValueFrom(service.ensureRestored());
    const second = firstValueFrom(service.ensureRestored());
    const request = http.expectOne(`${API}/auth/me`);
    request.flush(PRINCIPAL, { headers: { 'X-CSRF-Token': 'proof' } });
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(store.principal()).toEqual(PRINCIPAL);
    expect(store.csrfToken()).toBe('proof');
  });

  it.each([
    [401, PRINCIPAL, { 'X-CSRF-Token': 'proof' }],
    [500, null, {}],
    [200, { role: 'admin', expires_at: PRINCIPAL.expires_at }, { 'X-CSRF-Token': 'proof' }],
    [200, PRINCIPAL, { 'X-CSRF-Token': ' ' }],
  ])('fails restoration closed for invalid response %#', async (status, body, headers) => {
    const result = firstValueFrom(service.ensureRestored());
    http.expectOne(`${API}/auth/me`).flush(body, { status, statusText: 'response', headers });
    expect(await result).toBe(false);
    expect(store.lifecycle()).toBe('unauthenticated');
    expect(store.csrfToken()).toBeNull();
  });

  it('verifies login with auth/me before authenticating', async () => {
    const result = firstValueFrom(service.login('admin', 'password'));
    const login = http.expectOne(`${API}/auth/login`);
    expect(login.request.body).toEqual({ username: 'admin', password: 'password' });
    login.flush(null, {
      status: 204,
      statusText: 'No Content',
      headers: { 'X-CSRF-Token': 'first' },
    });
    expect(store.isAuthenticated()).toBe(false);
    http.expectOne(`${API}/auth/me`).flush(PRINCIPAL, { headers: { 'X-CSRF-Token': 'verified' } });
    await result;
    expect(store.isAuthenticated()).toBe(true);
    expect(store.csrfToken()).toBe('verified');
  });
});
