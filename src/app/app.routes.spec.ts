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
      'ml-refinement',
      'instruments/detail',
    ]);
    expect(routes.find((route) => route.path === '**')?.canActivate?.length).toBe(1);
  });

  it('lazy-loads ML Refinement inside the authenticated shell', () => {
    const shell = routes.find((route) => route.path === '');
    const refinement = shell?.children?.find((route) => route.path === 'ml-refinement');
    expect(refinement?.loadComponent).toBeTypeOf('function');
    expect(refinement?.canActivate).toBeUndefined();
  });
});
