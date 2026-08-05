import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { PaperStrategyApiService } from './paper-strategy-api.service';
import {
  actionWarning,
  deploymentActions,
  formatCurrency,
  lifecycleLabel,
  strategyLabel,
} from './paper-strategy.helpers';
import { CursorPage, DeploymentAction, PaperDeployment } from './paper-strategy.models';

@Component({
  selector: 'app-paper-strategies-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './paper-strategies-page.html',
  styleUrl: './paper-strategies-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaperStrategiesPage {
  private readonly api = inject(PaperStrategyApiService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private mutation?: Subscription;
  private generation = 0;

  readonly page = signal<CursorPage<PaperDeployment> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly refreshWarning = signal('');
  readonly status = signal('');
  readonly strategyKind = signal('');
  readonly includeArchived = signal(false);
  readonly cursor = signal<string | undefined>(undefined);
  readonly cursorHistory = signal<(string | undefined)[]>([]);
  readonly confirmation = signal<{ id: string; action: DeploymentAction } | null>(null);
  readonly pendingId = signal<string | null>(null);
  readonly mutationMessage = signal('');

  readonly actions = deploymentActions;
  readonly warning = actionWarning;
  readonly currency = formatCurrency;
  readonly lifecycle = lifecycleLabel;
  readonly strategy = strategyLabel;

  constructor() {
    this.load();
    this.destroyRef.onDestroy(() => {
      this.request?.unsubscribe();
      this.mutation?.unsubscribe();
    });
  }

  load(): void {
    const generation = ++this.generation;
    this.request?.unsubscribe();
    this.loading.set(!this.page());
    this.request = this.api
      .list({
        status: this.status() || undefined,
        strategy_kind: this.strategyKind() || undefined,
        include_archived: this.includeArchived(),
        cursor: this.cursor(),
        limit: 50,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (generation !== this.generation) return;
          this.page.set(page);
          this.loading.set(false);
          this.error.set('');
          this.refreshWarning.set('');
        },
        error: () => {
          if (generation !== this.generation) return;
          this.loading.set(false);
          const message = 'Paper deployments could not be refreshed.';
          if (this.page())
            this.refreshWarning.set(`${message} Previously loaded data is preserved.`);
          else this.error.set(message);
        },
      });
  }

  changeFilters(status: string, strategyKind: string, includeArchived: boolean): void {
    this.status.set(status);
    this.strategyKind.set(strategyKind);
    this.includeArchived.set(includeArchived);
    this.cursor.set(undefined);
    this.cursorHistory.set([]);
    this.confirmation.set(null);
    this.load();
  }

  next(): void {
    const next = this.page()?.next_cursor;
    if (!next) return;
    this.cursorHistory.update((history) => [...history, this.cursor()]);
    this.cursor.set(next);
    this.load();
  }

  previous(): void {
    const history = [...this.cursorHistory()];
    if (!history.length) return;
    this.cursor.set(history.pop());
    this.cursorHistory.set(history);
    this.load();
  }

  ask(item: PaperDeployment, action: DeploymentAction): void {
    if (!this.actions(item).includes(action)) return;
    this.confirmation.set({ id: item.id, action });
    this.mutationMessage.set('');
  }

  confirm(): void {
    const confirmation = this.confirmation();
    const generation = this.generation;
    if (!confirmation || this.pendingId()) return;
    this.pendingId.set(confirmation.id);
    this.mutation = this.api
      .mutate(confirmation.id, confirmation.action)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (generation !== this.generation) return;
          this.pendingId.set(null);
          this.confirmation.set(null);
          this.mutationMessage.set('Deployment state updated from backend authority.');
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          if (generation !== this.generation) return;
          this.pendingId.set(null);
          this.confirmation.set(null);
          this.mutationMessage.set(this.errorDetail(error));
          if (error.status === 409) this.load();
        },
      });
  }

  cancelConfirmation(): void {
    this.confirmation.set(null);
  }

  private errorDetail(error: HttpErrorResponse): string {
    const detail: unknown = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') {
      const values = detail as Record<string, unknown>;
      return (
        [values['code'], values['message']]
          .filter((value) => typeof value === 'string')
          .join(': ') || 'Deployment action failed.'
      );
    }
    return 'Deployment action failed. Previously loaded data is preserved.';
  }
}
