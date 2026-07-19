import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard-page').then((module) => module.DashboardPage),
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
