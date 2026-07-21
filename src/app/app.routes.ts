import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'strategies',
    loadComponent: () =>
      import('./features/strategy-research/strategy-research-page').then(
        (module) => module.StrategyResearchPage,
      ),
  },
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
    path: 'instruments/detail',
    loadComponent: () =>
      import('./features/instrument-detail/instrument-detail-page').then(
        (module) => module.InstrumentDetailPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
