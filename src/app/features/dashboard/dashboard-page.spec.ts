import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';

import { DashboardApiService } from './dashboard-api.service';
import { dashboardOverview, dashboardWithPaper } from './dashboard.fixture';
import { DashboardOverview } from './dashboard.models';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  const api = {
    getOverview: vi.fn<() => Observable<DashboardOverview>>(),
  };

  beforeEach(() => {
    api.getOverview.mockReset();
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [{ provide: DashboardApiService, useValue: api }],
    });
  });

  it('shows initial loading and then a data-driven instrument with no active run', () => {
    const response = new Subject<DashboardOverview>();
    api.getOverview.mockReturnValue(response);
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando overview');

    response.next(dashboardOverview);
    response.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin run activo');
    expect(fixture.nativeElement.textContent).toContain('Instrumento Test');
    expect(api.getOverview).toHaveBeenCalledTimes(1);
  });

  it('shows an initial HTTP error', () => {
    api.getOverview.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar el dashboard');
  });

  it('renders the complete Paper Trading summary without recalculating values', () => {
    api.getOverview.mockReturnValue(of(dashboardWithPaper));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('10.200,00 USDT');
    expect(fixture.nativeElement.textContent).toContain('2,00');
    expect(fixture.nativeElement.textContent).toContain('Puede ser anterior');
  });

  it('shows the run while reporting an unavailable current valuation', () => {
    api.getOverview.mockReturnValue(
      of({
        ...dashboardWithPaper,
        paper: { ...dashboardWithPaper.paper, portfolio: null },
      }),
    );
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Run active');
    expect(fixture.nativeElement.textContent).toContain('Valuación actual no disponible');
    expect(fixture.nativeElement.textContent).not.toContain('Sin run activo');
  });

  it('shows the run while reporting unavailable historical metrics', () => {
    api.getOverview.mockReturnValue(
      of({
        ...dashboardWithPaper,
        paper: { ...dashboardWithPaper.paper, performance: null },
      }),
    );
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Run active');
    expect(fixture.nativeElement.textContent).toContain(
      'Métricas históricas todavía no disponibles',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Sin run activo');
  });

  it('keeps previous data when a refresh fails and maps 409 safely', () => {
    api.getOverview.mockReturnValueOnce(of(dashboardOverview));
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    api.getOverview.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409 })));

    fixture.componentInstance.refresh();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Instrumento Test');
    expect(fixture.nativeElement.textContent).toContain('No se pudo valorar el portfolio');
    expect(api.getOverview).toHaveBeenCalledTimes(2);
  });
});
