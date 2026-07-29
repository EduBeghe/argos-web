import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

export const authenticatedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureRestored()
    .pipe(map((authenticated) => authenticated || router.createUrlTree(['/login'])));
};

export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureRestored()
    .pipe(map((authenticated) => (authenticated ? router.createUrlTree(['/']) : true)));
};
