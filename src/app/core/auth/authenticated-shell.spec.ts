import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthenticatedShell } from './authenticated-shell';
import { SessionStore } from './session.store';

describe('AuthenticatedShell', () => {
  let fixture: ComponentFixture<AuthenticatedShell>;
  let logout: Subject<void>;
  const auth = { logout: vi.fn() };

  beforeEach(async () => {
    logout = new Subject<void>();
    auth.logout.mockReturnValue(logout);
    await TestBed.configureTestingModule({
      imports: [AuthenticatedShell],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    TestBed.inject(SessionStore).authenticate(
      { username: 'admin', role: 'admin', expires_at: '2026-08-01T00:00:00Z' },
      'proof',
    );
    fixture = TestBed.createComponent(AuthenticatedShell);
    fixture.detectChanges();
  });

  it('shows the identity and prevents duplicate logout submissions', () => {
    expect(fixture.nativeElement.textContent).toContain('admin');
    fixture.componentInstance.logOut();
    fixture.componentInstance.logOut();
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('navigates after successful logout', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.logOut();
    logout.next();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('retains the session and exposes a retryable error after infrastructure failure', () => {
    fixture.componentInstance.logOut();
    logout.error(new Error('network'));
    fixture.detectChanges();
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Log out failed. Try again.');
    expect(fixture.componentInstance.loggingOut()).toBe(false);
  });
});
