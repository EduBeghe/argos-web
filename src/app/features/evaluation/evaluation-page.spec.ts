import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { evaluationFixture } from './evaluation.fixture';
import { EvaluationPage } from './evaluation-page';
import { PaperEvaluationApiService } from './paper-evaluation-api.service';
import { PaperEvaluationResponse } from './paper-evaluation.models';

describe('EvaluationPage', () => {
  const api = { getEvaluation: vi.fn() };

  beforeEach(() => {
    api.getEvaluation.mockReset();
    TestBed.configureTestingModule({
      imports: [EvaluationPage],
      providers: [provideRouter([]), { provide: PaperEvaluationApiService, useValue: api }],
    });
  });

  it('shows loading then the available generic evaluation without recomputing values', () => {
    const response = new Subject<PaperEvaluationResponse>();
    api.getEvaluation.mockReturnValue(response);
    const fixture = TestBed.createComponent(EvaluationPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading strategy evaluation');
    response.next(evaluationFixture);
    response.complete();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('+1.25%');
    expect(text).toContain('-0.50%');
    expect(text).toContain('GENERIC/USD');
    expect(text).toContain('provider-one');
    expect(text).toContain('provider-two');
    expect(text).toContain('Future action');
    expect(text).toContain('Future side');
    expect(fixture.nativeElement.querySelector('app-return-comparison-chart')).not.toBeNull();
  });

  it('treats 404 as a normal no-active-run state', () => {
    api.getEvaluation.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = TestBed.createComponent(EvaluationPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No active Paper Run');
    expect(fixture.nativeElement.textContent).not.toContain('Evaluation could not be loaded');
  });

  it('shows a generic failure and retries', () => {
    api.getEvaluation
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
      .mockReturnValueOnce(of(evaluationFixture));
    const fixture = TestBed.createComponent(EvaluationPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Evaluation could not be loaded');
    fixture.nativeElement.querySelector('.notice button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Evaluation summary');
  });

  it('preserves successful evidence when a refresh fails', () => {
    api.getEvaluation
      .mockReturnValueOnce(of(evaluationFixture))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = TestBed.createComponent(EvaluationPage);
    fixture.detectChanges();
    fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Evaluation refresh failed');
    expect(fixture.nativeElement.textContent).toContain('+1.25%');
  });

  it('does not render the chart and explains typed unavailability', () => {
    const unavailable: PaperEvaluationResponse = {
      ...evaluationFixture,
      strategy: {
        ...evaluationFixture.strategy,
        status: 'unavailable',
        unavailable_reason: 'no_equity_snapshot',
        total_return: null,
        closed_position_count: 0,
        win_rate: null,
        average_win: null,
        average_loss: null,
        profit_factor: null,
      },
      benchmark: {
        ...evaluationFixture.benchmark,
        status: 'unavailable',
        unavailable_reason: 'incomplete_candle_evidence',
        total_return: null,
        instruments: [
          {
            ...evaluationFixture.benchmark.instruments[0],
            status: 'unavailable',
            unavailable_reason: 'missing_compatible_candle',
          },
        ],
      },
      comparison: {
        status: 'unavailable',
        unavailable_reason: 'strategy_or_benchmark_unavailable',
        strategy_excess_return: null,
        strategy_minus_benchmark_pnl: null,
      },
    };
    api.getEvaluation.mockReturnValue(of(unavailable));
    const fixture = TestBed.createComponent(EvaluationPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-return-comparison-chart')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No persisted equity snapshot');
    expect(fixture.nativeElement.textContent).toContain('No closed positions yet');
    expect(fixture.nativeElement.textContent).toContain(
      'Compatible closed-candle evidence is missing',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Infinity');
  });

  it('keeps all progressive disclosure sections independent and collapsed', () => {
    api.getEvaluation.mockReturnValue(of(evaluationFixture));
    const fixture = TestBed.createComponent(EvaluationPage);
    fixture.detectChanges();
    const details = [...fixture.nativeElement.querySelectorAll('details')] as HTMLDetailsElement[];
    expect(details).toHaveLength(6);
    expect(details.every((item) => !item.open)).toBe(true);
    details[0].open = true;
    expect(details.slice(1).every((item) => !item.open)).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('app-metric-help').length).toBeGreaterThan(10);
  });
});
