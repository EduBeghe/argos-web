import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  signal,
} from '@angular/core';

import { metricDefinition, MetricKey } from '../../metrics/metric-definitions';

interface TooltipPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

let nextTooltipId = 0;

@Component({
  selector: 'app-metric-help',
  templateUrl: './metric-help.html',
  styleUrl: './metric-help.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricHelp implements OnDestroy {
  readonly metric = input.required<MetricKey>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly definition = computed(() => metricDefinition(this.metric()));
  protected readonly open = signal(false);
  protected readonly tooltipId = `metric-help-${++nextTooltipId}`;
  protected readonly position = signal<TooltipPosition>({
    left: 12,
    top: 12,
    width: 320,
    maxHeight: 320,
  });
  private pinned = false;
  private triggerHovered = false;
  private tooltipHovered = false;
  private focusOpen = false;
  private suppressHoverUntilLeave = false;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly renderedPosition = afterRenderEffect(() => {
    if (this.open()) this.updatePosition();
  });

  ngOnDestroy(): void {
    this.cancelClose();
  }

  protected handleTriggerEnter(): void {
    this.triggerHovered = true;
    this.cancelClose();
    if (!this.suppressHoverUntilLeave) this.reveal();
  }

  protected handleTriggerLeave(event: MouseEvent): void {
    this.triggerHovered = false;
    this.suppressHoverUntilLeave = false;
    if (
      event.relatedTarget instanceof Node &&
      this.element.nativeElement.contains(event.relatedTarget)
    ) {
      return;
    }
    this.scheduleClose();
  }

  protected handleTooltipEnter(): void {
    this.tooltipHovered = true;
    this.cancelClose();
    this.reveal();
  }

  protected handleTooltipLeave(event: MouseEvent): void {
    this.tooltipHovered = false;
    if (
      event.relatedTarget instanceof Node &&
      this.element.nativeElement.contains(event.relatedTarget)
    ) {
      return;
    }
    this.scheduleClose();
  }

  protected handleFocus(): void {
    this.focusOpen = true;
    this.cancelClose();
    this.reveal();
  }

  protected togglePinned(): void {
    if (this.pinned) {
      this.pinned = false;
      this.focusOpen = false;
      this.suppressHoverUntilLeave = true;
      this.closeNow();
      return;
    }
    this.pinned = true;
    this.suppressHoverUntilLeave = false;
    this.cancelClose();
    this.reveal();
  }

  protected handleFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !this.element.nativeElement.contains(nextTarget)) {
      this.focusOpen = false;
      if (!this.pinned && !this.triggerHovered && !this.tooltipHovered) {
        this.closeNow();
      } else {
        this.scheduleClose();
      }
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  protected handleOutsidePointer(event: PointerEvent): void {
    if (event.target instanceof Node && !this.element.nativeElement.contains(event.target)) {
      this.dismiss();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.dismiss();
  }

  @HostListener('window:resize')
  protected handleResize(): void {
    if (this.open()) this.updatePosition();
  }

  @HostListener('window:scroll')
  protected handleScroll(): void {
    if (this.open()) this.dismiss();
  }

  private reveal(): void {
    this.open.set(true);
  }

  private dismiss(): void {
    this.pinned = false;
    this.focusOpen = false;
    this.triggerHovered = false;
    this.tooltipHovered = false;
    this.suppressHoverUntilLeave = false;
    this.closeNow();
  }

  private scheduleClose(): void {
    if (this.pinned || this.focusOpen) return;
    this.cancelClose();
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      if (!this.pinned && !this.focusOpen && !this.triggerHovered && !this.tooltipHovered) {
        this.open.set(false);
      }
    }, 50);
  }

  private closeNow(): void {
    this.cancelClose();
    this.open.set(false);
  }

  private cancelClose(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private updatePosition(): void {
    const trigger = this.element.nativeElement.querySelector<HTMLElement>('button');
    const tooltip = this.element.nativeElement.querySelector<HTMLElement>('.metric-help-bubble');
    if (!trigger || !tooltip) return;
    const triggerBounds = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const gap = 8;
    const width = Math.min(320, Math.max(1, viewportWidth - margin * 2));
    tooltip.style.width = `${width}px`;
    tooltip.style.maxHeight = 'none';
    const naturalHeight = Math.max(tooltip.scrollHeight, tooltip.getBoundingClientRect().height, 1);
    const left = Math.min(
      Math.max(triggerBounds.left, margin),
      Math.max(margin, viewportWidth - width - margin),
    );
    const availableBelow = Math.max(0, viewportHeight - margin - triggerBounds.bottom - gap);
    const availableAbove = Math.max(0, triggerBounds.top - gap - margin);
    const fitsBelow = naturalHeight <= availableBelow;
    const fitsAbove = naturalHeight <= availableAbove;
    const placeBelow = fitsBelow || (!fitsAbove && availableBelow >= availableAbove);
    const maxHeight = Math.max(
      1,
      Math.min(naturalHeight, placeBelow ? availableBelow : availableAbove),
    );
    const renderedHeight = Math.min(naturalHeight, maxHeight);
    const desiredTop = placeBelow
      ? triggerBounds.bottom + gap
      : triggerBounds.top - gap - renderedHeight;
    const top = Math.min(
      Math.max(desiredTop, margin),
      Math.max(margin, viewportHeight - renderedHeight - margin),
    );
    this.position.set({
      left,
      top,
      width,
      maxHeight,
    });
  }
}
