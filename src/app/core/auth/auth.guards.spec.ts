import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';

import { AuthService } from './auth.service';
import { authenticatedGuard, loginGuard } from './auth.guards';

describe('authentication guards', () => {
  const auth = { ensureRestored: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  it.each(['unauthenticated', 'unavailable'] as const)(
    'redirects a private route after %s restoration',
    async (outcome) => {
      auth.ensureRestored.mockReturnValue(of(outcome));
      const result = await runGuard(authenticatedGuard);
      expect(result).toBeInstanceOf(UrlTree);
      expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
    },
  );

  it('activates private routes only after authenticated restoration', async () => {
    auth.ensureRestored.mockReturnValue(of('authenticated'));
    expect(await runGuard(authenticatedGuard)).toBe(true);
  });

  it.each(['unauthenticated', 'unavailable'] as const)('allows login for %s', async (outcome) => {
    auth.ensureRestored.mockReturnValue(of(outcome));
    expect(await runGuard(loginGuard)).toBe(true);
  });

  it('redirects authenticated login navigation home', async () => {
    auth.ensureRestored.mockReturnValue(of('authenticated'));
    const result = await runGuard(loginGuard);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });
});

async function runGuard(guard: typeof authenticatedGuard): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
  return firstValueFrom(result as Observable<boolean | UrlTree>);
}
