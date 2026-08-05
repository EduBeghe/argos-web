import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject } from 'rxjs';

import { PaperStrategiesPage } from './paper-strategies-page';
import { PaperStrategyApiService } from './paper-strategy-api.service';
import { CursorPage, PaperDeployment } from './paper-strategy.models';

const deployment: PaperDeployment = {
  id: 'deployment-1',
  display_name: 'Validated strategy',
  strategy_kind: 'ml_fixed_horizon_long_only',
  lifecycle: 'active',
  is_primary: false,
  current_cash: '10000',
  open_position_count: 0,
  current_run_id: null,
  created_at: '2026-01-01T00:00:00Z',
  paused_at: null,
  archived_at: null,
};
const page: CursorPage<PaperDeployment> = {
  items: [deployment],
  next_cursor: 'next-page',
  has_more: true,
};

describe('PaperStrategiesPage', () => {
  const api = {
    list: vi.fn<() => Observable<CursorPage<PaperDeployment>>>(),
    mutate: vi.fn<() => Observable<PaperDeployment>>(),
  };

  beforeEach(() => {
    api.list.mockReset().mockReturnValue(of(page));
    api.mutate.mockReset().mockReturnValue(of({ ...deployment, lifecycle: 'paused' }));
    TestBed.configureTestingModule({
      imports: [PaperStrategiesPage],
      providers: [{ provide: PaperStrategyApiService, useValue: api }],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(PaperStrategiesPage);
    fixture.detectChanges();
    return fixture;
  }

  function beginMutation(fixture: ReturnType<typeof create>, request: Subject<PaperDeployment>) {
    api.mutate.mockReturnValue(request.asObservable());
    const component = fixture.componentInstance;
    component.ask(deployment, 'pause');
    component.confirm();
    fixture.detectChanges();
    return component;
  }

  it('disables refresh, filters, pagination and other actions while a mutation is pending', () => {
    const fixture = create();
    const pending = new Subject<PaperDeployment>();
    const component = beginMutation(fixture, pending);
    const initialLists = api.list.mock.calls.length;
    component.load();
    component.changeFilters('paused', '', false);
    component.next();
    component.previous();
    component.ask(deployment, 'make-primary');
    expect(api.list).toHaveBeenCalledTimes(initialLists);
    expect(component.status()).toBe('');
    expect(component.confirmation()?.action).toBe('pause');
    expect(
      [...fixture.nativeElement.querySelectorAll('button, select, input')].filter(
        (control: HTMLButtonElement | HTMLSelectElement | HTMLInputElement) => control.disabled,
      ).length,
    ).toBeGreaterThan(5);
    fixture.destroy();
  });

  it('clears pending after success and reloads the authoritative page', () => {
    const fixture = create();
    const pending = new Subject<PaperDeployment>();
    const component = beginMutation(fixture, pending);
    const listCalls = api.list.mock.calls.length;
    pending.next({ ...deployment, lifecycle: 'paused' });
    expect(component.pendingId()).toBeNull();
    expect(component.confirmation()).toBeNull();
    expect(api.list.mock.calls.length).toBe(listCalls + 1);
    fixture.destroy();
  });

  it('clears pending and refreshes after HTTP 409', () => {
    const fixture = create();
    const pending = new Subject<PaperDeployment>();
    const component = beginMutation(fixture, pending);
    const listCalls = api.list.mock.calls.length;
    pending.error(new HttpErrorResponse({ status: 409, error: { detail: 'State changed' } }));
    expect(component.pendingId()).toBeNull();
    expect(component.mutationMessage()).toBe('State changed');
    expect(api.list.mock.calls.length).toBe(listCalls + 1);
    fixture.destroy();
  });

  it('preserves the loaded page and exposes structured non-conflict errors', () => {
    const fixture = create();
    const pending = new Subject<PaperDeployment>();
    const component = beginMutation(fixture, pending);
    const original = component.page();
    const listCalls = api.list.mock.calls.length;
    pending.error(
      new HttpErrorResponse({
        status: 422,
        error: { detail: { code: 'invalid_transition', message: 'Cannot pause' } },
      }),
    );
    expect(component.pendingId()).toBeNull();
    expect(component.page()).toBe(original);
    expect(component.mutationMessage()).toBe('invalid_transition: Cannot pause');
    expect(api.list.mock.calls.length).toBe(listCalls);
    fixture.destroy();
  });

  it('unsubscribes and clears pending on teardown', () => {
    const fixture = create();
    const pending = new Subject<PaperDeployment>();
    const component = beginMutation(fixture, pending);
    fixture.destroy();
    expect(component.pendingId()).toBeNull();
    expect(pending.observed).toBe(false);
  });
});

