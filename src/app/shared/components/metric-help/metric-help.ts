import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';

import { metricDefinition, MetricKey } from '../../metrics/metric-definitions';

interface TooltipPosition {
  left: number;
  top: number | null;
  bottom: number | null;
  width: number;
}

let nextTooltipId = 0;

@Component({
  selector: 'app-metric-help',
  templateUrl: './metric-help.html',
  styleUrl: './metric-help.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricHelp {
  readonly metric = input.required<MetricKey>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly definition = computed(() => metricDefinition(this.metric()));
  protected readonly open = signal(false);
  protected readonly tooltipId = `metric-help-${++nextTooltipId}`;
  protected readonly position = signal<TooltipPosition>({
    left: 12,
    top: null,
    bottom: null,
    width: 320,
  });
  protected show(): void {
    this.updatePosition();
    this.open.set(true);
  }

  protected hide(): void {
    this.open.set(false);
  }

  protected toggle(): void {
    if (this.open()) {
      this.hide();
    } else {
      this.show();
    }
  }

  protected handleFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !this.element.nativeElement.contains(nextTarget)) {
      this.hide();
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  protected handleOutsidePointer(event: PointerEvent): void {
    if (event.target instanceof Node && !this.element.nativeElement.contains(event.target)) {
      this.hide();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.hide();
  }

  @HostListener('window:resize')
  protected handleResize(): void {
    if (this.open()) this.updatePosition();
  }

  private updatePosition(): void {
    const trigger = this.element.nativeElement.querySelector('button');
    if (!trigger) return;
    const bounds = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const width = Math.min(320, Math.max(240, viewportWidth - margin * 2));
    const left = Math.min(
      Math.max(bounds.left, margin),
      Math.max(margin, viewportWidth - width - margin),
    );
    const estimatedHeight = 220;
    const fitsBelow = bounds.bottom + estimatedHeight + margin <= viewportHeight;
    this.position.set({
      left,
      top: fitsBelow ? bounds.bottom + 8 : null,
      bottom: fitsBelow ? null : viewportHeight - bounds.top + 8,
      width,
    });
  }
}
