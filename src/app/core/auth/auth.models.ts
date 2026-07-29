export interface AuthPrincipal {
  username: string;
  role: string;
  expires_at: string;
}

export type SessionLifecycle = 'checking' | 'authenticated' | 'unauthenticated';

export type LoginErrorCode =
  'invalid_credentials' | 'not_configured' | 'session_not_established' | 'unavailable';

export class LoginError extends Error {
  constructor(readonly code: LoginErrorCode) {
    super(code);
  }
}
