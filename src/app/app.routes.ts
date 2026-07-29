import { Routes } from '@angular/router';

import { authenticatedGuard, loginGuard } from './core/auth/auth.guards';
import { AuthenticatedShell } from './core/auth/authenticated-shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/login/login-page').then((module) => module.LoginPage),
  },
  {
    path: '',
    component: AuthenticatedShell,
    canActivate: [authenticatedGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((module) => module.DashboardPage),
      },
      {
        path: 'evaluation',
        loadComponent: () =>
          import('./features/evaluation/evaluation-page').then((module) => module.EvaluationPage),
      },
      {
        path: 'strategies',
        loadComponent: () =>
          import('./features/strategy-research/strategy-research-page').then(
            (module) => module.StrategyResearchPage,
          ),
      },
      {
        path: 'instruments/detail',
        loadComponent: () =>
          import('./features/instrument-detail/instrument-detail-page').then(
            (module) => module.InstrumentDetailPage,
          ),
      },
    ],
  },
  { path: '**', canActivate: [authenticatedGuard], redirectTo: '' },
];
