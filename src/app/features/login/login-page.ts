import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { LoginError, LoginErrorCode } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/auth/session.store';

const ERROR_COPY: Record<LoginErrorCode, string> = {
  invalid_credentials: 'Invalid username or password.',
  not_configured: 'Authentication is not configured.',
  session_not_established:
    'Argos could not establish a browser session. Allow cross-site cookies for the Argos API and try again.',
  unavailable: 'Argos authentication is unavailable. Try again.',
};

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly session = inject(SessionStore);
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');
  readonly pending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: Validators.required }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  submit(): void {
    if (this.pending() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.getRawValue();
    this.pending.set(true);
    this.errorMessage.set(null);
    this.form.disable();
    this.auth
      .login(username, password)
      .pipe(
        finalize(() => {
          this.pending.set(false);
          this.form.enable();
        }),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (error: unknown) => {
          const code = error instanceof LoginError ? error.code : 'unavailable';
          this.errorMessage.set(ERROR_COPY[code]);
          this.form.controls.password.reset('');
          queueMicrotask(() => this.passwordInput()?.nativeElement.focus());
        },
      });
  }

  retrySession(): void {
    if (this.pending()) return;
    this.pending.set(true);
    this.errorMessage.set(null);
    this.form.disable();
    this.auth
      .retryRestore()
      .pipe(
        finalize(() => {
          this.pending.set(false);
          this.form.enable();
        }),
      )
      .subscribe((outcome) => {
        if (outcome === 'authenticated') void this.router.navigateByUrl('/');
      });
  }
}
