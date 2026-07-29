import { computed, Injectable, signal } from '@angular/core';

import { AuthPrincipal, SessionLifecycle } from './auth.models';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly lifecycleState = signal<SessionLifecycle>('checking');
  private readonly principalState = signal<AuthPrincipal | null>(null);
  private readonly restorationUnavailableState = signal(false);
  private csrfProof: string | null = null;

  readonly lifecycle = this.lifecycleState.asReadonly();
  readonly principal = this.principalState.asReadonly();
  readonly restorationUnavailable = this.restorationUnavailableState.asReadonly();
  readonly isAuthenticated = computed(() => this.lifecycleState() === 'authenticated');

  csrfToken(): string | null {
    return this.csrfProof;
  }

  checking(): void {
    this.restorationUnavailableState.set(false);
    this.lifecycleState.set('checking');
  }

  authenticate(principal: AuthPrincipal, csrfProof: string): void {
    this.principalState.set(principal);
    this.csrfProof = csrfProof;
    this.restorationUnavailableState.set(false);
    this.lifecycleState.set('authenticated');
  }

  clear({ restorationUnavailable = false }: { restorationUnavailable?: boolean } = {}): void {
    this.principalState.set(null);
    this.csrfProof = null;
    this.restorationUnavailableState.set(restorationUnavailable);
    this.lifecycleState.set('unauthenticated');
  }
}
