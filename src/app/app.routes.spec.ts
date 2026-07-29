import { routes } from './app.routes';

describe('application route protection', () => {
  it('keeps login separate and places every application route under one guarded shell', () => {
    const login = routes.find((route) => route.path === 'login');
    const shell = routes.find((route) => route.path === '');
    expect(login?.canActivate?.length).toBe(1);
    expect(shell?.canActivate?.length).toBe(1);
    expect(shell?.children?.map((route) => route.path)).toEqual([
      '',
      'evaluation',
      'strategies',
      'instruments/detail',
    ]);
    expect(routes.find((route) => route.path === '**')?.canActivate?.length).toBe(1);
  });
});
