import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api-config';
import { SessionStore } from './session.store';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const store = inject(SessionStore);
  const router = inject(Router);
  const isApiRequest = request.url === apiBaseUrl || request.url.startsWith(`${apiBaseUrl}/`);
  if (!isApiRequest) return next(request);

  const csrf = store.csrfToken();
  const outgoing = request.clone({
    withCredentials: true,
    setHeaders: UNSAFE_METHODS.has(request.method) && csrf ? { 'X-CSRF-Token': csrf } : {},
  });
  const isLogin = request.url === `${apiBaseUrl}/auth/login`;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        ((!isLogin && error.status === 401) ||
          (UNSAFE_METHODS.has(request.method) && error.status === 403))
      ) {
        store.clear();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
