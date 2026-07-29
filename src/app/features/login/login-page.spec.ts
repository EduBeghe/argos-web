import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { LoginError } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let attempt: Subject<void>;
  const auth = { login: vi.fn(), retryRestore: vi.fn() };

  beforeEach(async () => {
    attempt = new Subject<void>();
    auth.login.mockReturnValue(attempt);
    auth.retryRestore.mockReturnValue(of('unauthenticated'));
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });

  it('renders accessible required credential fields', () => {
    const element = fixture.nativeElement as HTMLElement;
    const username = element.querySelector<HTMLInputElement>('#username')!;
    const password = element.querySelector<HTMLInputElement>('#password')!;
    expect(element.querySelector('label[for="username"]')?.textContent).toContain('Username');
    expect(element.querySelector('label[for="password"]')?.textContent).toContain('Password');
    expect(username.autocomplete).toBe('username');
    expect(password.autocomplete).toBe('current-password');
    expect(username.required).toBe(true);
    expect(password.required).toBe(true);
    expect(element.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('submits once, disables while pending, and navigates only after verification', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.setValue({ username: 'admin', password: 'secret' });
    fixture.componentInstance.submit();
    fixture.componentInstance.submit();
    expect(auth.login).toHaveBeenCalledOnce();
    expect(auth.login).toHaveBeenCalledWith('admin', 'secret');
    expect(fixture.componentInstance.pending()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    attempt.next();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('clears the password and uses exact generic credential error copy', async () => {
    fixture.componentInstance.form.setValue({ username: 'admin', password: 'wrong' });
    fixture.componentInstance.submit();
    attempt.error(new LoginError('invalid_credentials'));
    await Promise.resolve();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.username.value).toBe('admin');
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Invalid username or password.');
  });

  it('shows retry only for unavailable restoration and prevents duplicate retries', () => {
    const session = fixture.componentInstance.session;
    session.clear({ restorationUnavailable: true });
    const retry = new Subject<'authenticated' | 'unauthenticated' | 'unavailable'>();
    auth.retryRestore.mockReturnValue(retry);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Argos authentication is unavailable. Try again.',
    );
    fixture.componentInstance.retrySession();
    fixture.componentInstance.retrySession();
    expect(auth.retryRestore).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.pending()).toBe(true);
    retry.next('unauthenticated');
    retry.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain(
      'Argos authentication is unavailable. Try again.',
    );
  });
});
