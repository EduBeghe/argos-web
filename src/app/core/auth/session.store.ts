import { computed, Injectable, signal } from '@angular/core';

import { AuthPrincipal, SessionLifecycle } from './auth.models';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly lifecycleState = signal<SessionLifecycle>('checking');
  private readonly principalState = signal<AuthPrincipal | null>(null);
  private csrfProof: string | null = null;

  readonly lifecycle = this.lifecycleState.asReadonly();
  readonly principal = this.principalState.asReadonly();
  readonly isAuthenticated = computed(() => this.lifecycleState() === 'authenticated');

  csrfToken(): string | null {
    return this.csrfProof;
  }

  checking(): void {
    this.lifecycleState.set('checking');
  }

  authenticate(principal: AuthPrincipal, csrfProof: string): void {
    this.principalState.set(principal);
    this.csrfProof = csrfProof;
    this.lifecycleState.set('authenticated');
  }

  clear(): void {
    this.principalState.set(null);
    this.csrfProof = null;
    this.lifecycleState.set('unauthenticated');
  }
}
