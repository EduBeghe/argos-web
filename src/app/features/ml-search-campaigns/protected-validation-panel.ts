import { DatePipe, KeyValuePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription, timer } from 'rxjs';

import {
  CampaignFamilyAuditResponse,
  FinalValidationResponse,
  SearchCampaignFamily,
  TemporalManifestResponse,
} from './ml-search-campaign.models';
import { ProtectedValidationApiService } from './protected-validation-api.service';
import {
  currentValidationContract,
  displayValue,
  reasonLabel,
  terminalWorkStatus,
  validDisplayName,
  validationPresentation,
} from './protected-validation.helpers';

@Component({
  selector: 'app-protected-validation-panel',
  imports: [DatePipe, KeyValuePipe, RouterLink],
  templateUrl: './protected-validation-panel.html',
  styleUrl: './protected-validation-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtectedValidationPanel {
  readonly campaignId = input.required<string>();
  readonly family = input.required<SearchCampaignFamily>();
  private readonly api = inject(ProtectedValidationApiService);
  private readonly destroyRef = inject(DestroyRef);
  private requests: Subscription[] = [];
  private poll?: Subscription;
  private generation = 0;
  private context = '';

  readonly opened = signal(false);
  readonly audit = signal<CampaignFamilyAuditResponse | null>(null);
  readonly manifest = signal<TemporalManifestResponse | null>(null);
  readonly validations = signal<FinalValidationResponse[]>([]);
  readonly selectedValidation = signal<FinalValidationResponse | null>(null);
  readonly loading = signal(false);
  readonly auditError = signal('');
  readonly validationError = signal('');
  readonly mutationError = signal('');
  readonly confirmation = signal<'validate' | 'manifest-cancel' | 'validation-cancel' | null>(null);
  readonly pending = signal(false);
  readonly displayName = signal('');
  readonly makePrimary = signal(false);
  readonly deployedId = signal<string | null>(null);

  readonly compatible = currentValidationContract;
  readonly presentation = validationPresentation;
  readonly value = displayValue;
  readonly reason = reasonLabel;
  readonly validName = validDisplayName;

  constructor() {
    effect(() => {
      const context = `${this.campaignId()}:${this.family().id}`;
      if (this.context && context !== this.context) {
        this.cancelAll();
        this.opened.set(false);
        this.audit.set(null);
        this.manifest.set(null);
        this.validations.set([]);
        this.selectedValidation.set(null);
        this.confirmation.set(null);
        this.deployedId.set(null);
      }
      this.context = context;
    });
    this.destroyRef.onDestroy(() => this.cancelAll());
    document.addEventListener('visibilitychange', this.visibilityChanged);
    this.destroyRef.onDestroy(() =>
      document.removeEventListener('visibilitychange', this.visibilityChanged),
    );
  }

  open(): void {
    if (this.opened()) return;
    this.opened.set(true);
    this.refresh();
  }

  refresh(): void {
    const generation = ++this.generation;
    this.cancelRequests();
    this.loading.set(true);
    this.requests.push(
      this.api
        .audit(this.campaignId(), this.family().id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (audit) => {
            if (generation !== this.generation) return;
            this.audit.set(audit);
            this.manifest.set(null);
            if (audit.reconstructed_manifest_id) {
              this.requests.push(
                this.api
                  .manifest(audit.reconstructed_manifest_id)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe({
                    next: (manifest) => {
                      if (generation !== this.generation) return;
                      this.manifest.set(manifest);
                      this.configurePolling();
                    },
                    error: () => {
                      if (generation !== this.generation) return;
                      this.mutationError.set('Temporal manifest detail is unavailable.');
                    },
                  }),
              );
            }
            this.auditError.set('');
            this.loading.set(false);
            this.configurePolling();
          },
          error: () => {
            if (generation !== this.generation) return;
            this.auditError.set(
              'Development audit could not be refreshed. Existing evidence is preserved.',
            );
            this.loading.set(false);
          },
        }),
    );
    this.requests.push(
      this.api
        .validations(this.campaignId(), this.family().id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (page) => {
            if (generation !== this.generation) return;
            const items = [...page.items].sort((a, b) => b.created_at.localeCompare(a.created_at));
            this.validations.set(items);
            this.selectedValidation.set(items[0] ?? null);
            this.validationError.set('');
            this.configurePolling();
          },
          error: () => {
            if (generation !== this.generation) return;
            this.validationError.set(
              'Final validations could not be refreshed. Existing evidence is preserved.',
            );
          },
        }),
    );
  }

  reconstruct(): void {
    this.run(this.api.reconstruct(this.campaignId(), this.family().id), (manifest) => {
      this.manifest.set(manifest);
      this.configurePolling();
    });
  }
  retryManifest(): void {
    const item = this.manifest();
    if (item)
      this.run(this.api.manifestAction(item.id, 'retry'), (value) => {
        this.manifest.set(value);
        this.configurePolling();
      });
  }
  cancelManifest(): void {
    const item = this.manifest();
    if (item)
      this.run(this.api.manifestAction(item.id, 'cancel'), (value) => {
        this.confirmation.set(null);
        this.manifest.set(value);
        this.configurePolling();
      });
  }
  enqueueValidation(): void {
    if (!this.audit()?.overall_valid) return;
    this.run(this.api.enqueueValidation(this.campaignId(), this.family().id), (value) => {
      this.confirmation.set(null);
      this.selectedValidation.set(value);
      this.validations.update((items) => [value, ...items.filter((item) => item.id !== value.id)]);
      this.configurePolling();
    });
  }
  retryValidation(): void {
    const item = this.selectedValidation();
    if (item && this.compatible(item) && !item.protected_data_read_at)
      this.run(this.api.validationAction(item.id, 'retry'), (value) => {
        this.selectedValidation.set(value);
        this.configurePolling();
      });
  }
  cancelValidation(): void {
    const item = this.selectedValidation();
    if (item)
      this.run(this.api.validationAction(item.id, 'cancel'), (value) => {
        this.confirmation.set(null);
        this.selectedValidation.set(value);
        this.configurePolling();
      });
  }
  deploy(): void {
    const item = this.selectedValidation();
    const name = this.displayName();
    if (
      !item ||
      item.status !== 'completed' ||
      item.classification !== 'passed' ||
      !this.compatible(item) ||
      !this.validName(name)
    )
      return;
    this.run(this.api.deploy(item.id, name, this.makePrimary()), (value) =>
      this.deployedId.set(value.id),
    );
  }

  selectValidation(item: FinalValidationResponse): void {
    this.selectedValidation.set(item);
    this.configurePolling();
  }
  setConfirmation(value: 'validate' | 'manifest-cancel' | 'validation-cancel' | null): void {
    this.confirmation.set(value);
  }

  private run<T>(request: import('rxjs').Observable<T>, success: (value: T) => void): void {
    const generation = this.generation;
    if (this.pending()) return;
    this.pending.set(true);
    this.mutationError.set('');
    this.requests.push(
      request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (value) => {
          if (generation !== this.generation) return;
          this.pending.set(false);
          success(value);
        },
        error: (error: HttpErrorResponse) => {
          if (generation !== this.generation) return;
          this.pending.set(false);
          this.mutationError.set(this.errorDetail(error));
          if (error.status === 409) this.refresh();
        },
      }),
    );
  }
  private configurePolling(): void {
    this.poll?.unsubscribe();
    if (document.hidden) return;
    const manifest = this.manifest();
    const validation = this.selectedValidation();
    if (
      (manifest && !terminalWorkStatus(manifest.status)) ||
      (validation && !terminalWorkStatus(validation.status))
    ) {
      this.poll = timer(5000, 5000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.pollSelected());
    }
  }
  private pollSelected(): void {
    if (document.hidden) return;
    const generation = this.generation;
    const manifest = this.manifest();
    const validation = this.selectedValidation();
    if (manifest && !terminalWorkStatus(manifest.status)) {
      this.requests.push(
        this.api.manifest(manifest.id).subscribe({
          next: (value) => {
            if (generation !== this.generation) return;
            this.manifest.set(value);
            if (value.status === 'completed' && value.fingerprint_verified && value.counts_verified)
              this.refresh();
            else this.configurePolling();
          },
          error: () => {
            this.mutationError.set('Manifest polling failed. Use Refresh to continue.');
            this.poll?.unsubscribe();
          },
        }),
      );
      return;
    }
    if (validation && !terminalWorkStatus(validation.status)) {
      this.requests.push(
        this.api.validation(validation.id).subscribe({
          next: (value) => {
            if (generation !== this.generation) return;
            this.selectedValidation.set(value);
            this.validations.update((items) => [
              value,
              ...items.filter((item) => item.id !== value.id),
            ]);
            this.configurePolling();
          },
          error: () => {
            this.mutationError.set('Validation polling failed. Use Refresh to continue.');
            this.poll?.unsubscribe();
          },
        }),
      );
    }
  }
  private readonly visibilityChanged = (): void => {
    if (document.hidden) this.poll?.unsubscribe();
    else this.configurePolling();
  };
  private cancelRequests(): void {
    this.requests.forEach((request) => request.unsubscribe());
    this.requests = [];
    this.poll?.unsubscribe();
  }
  private cancelAll(): void {
    this.generation += 1;
    this.cancelRequests();
  }
  private errorDetail(error: HttpErrorResponse): string {
    const detail: unknown = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') {
      const data = detail as Record<string, unknown>;
      return (
        [data['code'], data['message']].filter((value) => typeof value === 'string').join(': ') ||
        'Protected workflow action failed.'
      );
    }
    return 'Protected workflow action failed.';
  }
}
