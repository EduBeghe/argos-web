import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { API_BASE_URL } from '../config/api-config';
import { AuthPrincipal, LoginError, LoginErrorCode } from './auth.models';
import { SessionStore } from './session.store';

const CSRF_HEADER = 'X-CSRF-Token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly store = inject(SessionStore);
  private restoration$: Observable<boolean> | null = null;

  ensureRestored(): Observable<boolean> {
    if (this.store.lifecycle() !== 'checking') {
      return of(this.store.isAuthenticated());
    }
    if (!this.restoration$) {
      this.restoration$ = this.fetchSession().pipe(
        map(() => true),
        catchError(() => {
          this.store.clear();
          return of(false);
        }),
        finalize(() => (this.restoration$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.restoration$;
  }

  retryRestore(): Observable<boolean> {
    this.store.checking();
    return this.ensureRestored();
  }

  login(username: string, password: string): Observable<void> {
    return this.http
      .post<void>(`${this.apiBaseUrl}/auth/login`, { username, password }, { observe: 'response' })
      .pipe(
        switchMap((response) => {
          this.requireCsrf(response);
          return this.fetchSession().pipe(
            map(() => undefined),
            catchError((error: unknown) =>
              throwError(
                () =>
                  new LoginError(
                    error instanceof HttpErrorResponse && error.status === 401
                      ? 'session_not_established'
                      : 'unavailable',
                  ),
              ),
            ),
          );
        }),
        catchError((error: unknown) => {
          if (error instanceof LoginError) return throwError(() => error);
          return throwError(() => new LoginError(this.loginErrorCode(error)));
        }),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiBaseUrl}/auth/logout`, null, { observe: 'response' })
      .pipe(
        tap(() => this.store.clear()),
        map(() => undefined),
        catchError((error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            this.store.clear();
            return of(undefined);
          }
          return throwError(() => error);
        }),
      );
  }

  private fetchSession(): Observable<AuthPrincipal> {
    return this.http.get<unknown>(`${this.apiBaseUrl}/auth/me`, { observe: 'response' }).pipe(
      map((response) => {
        const principal = this.requirePrincipal(response.body);
        this.store.authenticate(principal, this.requireCsrf(response));
        return principal;
      }),
    );
  }

  private requireCsrf(response: HttpResponse<unknown>): string {
    const value = response.headers.get(CSRF_HEADER)?.trim();
    if (!value) throw new LoginError('unavailable');
    return value;
  }

  private requirePrincipal(value: unknown): AuthPrincipal {
    if (!value || typeof value !== 'object') throw new LoginError('unavailable');
    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate['username'] !== 'string' ||
      !candidate['username'].trim() ||
      typeof candidate['role'] !== 'string' ||
      !candidate['role'].trim() ||
      typeof candidate['expires_at'] !== 'string' ||
      !candidate['expires_at'].trim() ||
      Number.isNaN(Date.parse(candidate['expires_at']))
    ) {
      throw new LoginError('unavailable');
    }
    return {
      username: candidate['username'],
      role: candidate['role'],
      expires_at: candidate['expires_at'],
    };
  }

  private loginErrorCode(error: unknown): LoginErrorCode {
    if (error instanceof HttpErrorResponse && error.status === 401) return 'invalid_credentials';
    if (error instanceof HttpErrorResponse && error.status === 503) return 'not_configured';
    return 'unavailable';
  }
}
