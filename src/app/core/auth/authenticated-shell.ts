import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

@Component({
  selector: 'app-authenticated-shell',
  imports: [RouterOutlet],
  template: `
    <header class="session-bar">
      <span class="identity"
        >Signed in as <strong>{{ store.principal()?.username }}</strong></span
      >
      <button type="button" [disabled]="loggingOut()" (click)="logOut()">
        {{ loggingOut() ? 'Logging outâ€¦' : 'Log out' }}
      </button>
    </header>
    @if (logoutError()) {
      <p class="logout-error" role="alert">Log out failed. Try again.</p>
    }
    <router-outlet />
  `,
  styles: `
    .session-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 1rem;
      min-height: 3.25rem;
      padding: 0.65rem clamp(1rem, 3vw, 2rem);
      color: #aabbd0;
      background: #0b1524;
      border-bottom: 1px solid #26364a;
    }
    .identity {
      font-size: 0.9rem;
    }
    strong {
      color: #d8e3ef;
      font-weight: 600;
    }
    button {
      border: 1px solid #52677f;
      border-radius: 0.45rem;
      padding: 0.45rem 0.8rem;
      color: #d8e3ef;
      background: #172538;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: #21344b;
    }
    button:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .logout-error {
      margin: 0.75rem 1rem 0;
      color: #ddb1ae;
      text-align: right;
    }
    @media (max-width: 32rem) {
      .session-bar {
        justify-content: space-between;
      }
    }
  `,
})
export class AuthenticatedShell {
  readonly store = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loggingOut = signal(false);
  readonly logoutError = signal(false);

  logOut(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.logoutError.set(false);
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => {
        this.loggingOut.set(false);
        this.logoutError.set(true);
      },
      complete: () => this.loggingOut.set(false),
    });
  }
}
