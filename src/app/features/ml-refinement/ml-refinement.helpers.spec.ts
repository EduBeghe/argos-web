import {
  baselineSearchSpace,
  formatDuration,
  serializeRefinementRequest,
} from './ml-refinement.helpers';

describe('ML refinement helpers', () => {
  it('formats exact durations without hiding seconds', () => {
    expect(formatDuration(1_800)).toBe('30m');
    expect(formatDuration(14_400)).toBe('4h');
    expect(formatDuration(86_400)).toBe('1d');
  });

  it('uses persisted values before narrowly documented missing defaults', () => {
    expect(
      baselineSearchSpace('lightgbm', {
        lightgbm: { learning_rate: 0.03, n_estimators: 80, max_depth: 4, num_leaves: 15 },
      }),
    ).toEqual({
      engine: 'lightgbm',
      learning_rate: { values: [0.03] },
      n_estimators: { values: [80] },
      max_depth: { values: [4] },
      num_leaves: { values: [15] },
      min_child_samples: { values: [20] },
      subsample: { values: [1] },
      colsample_bytree: { values: [1] },
      reg_alpha: { values: [0] },
      reg_lambda: { values: [0] },
    });
    expect(baselineSearchSpace('ridge', { alpha: 2.5 })).toEqual({
      engine: 'ridge',
      alpha: { values: [2.5] },
      fit_intercept: { values: [true] },
    });
  });

  it('serializes the exact backend request shape, fractions, seconds and null notes', () => {
    expect(
      serializeRefinementRequest('run', 'result', {
        engines: ['ridge'],
        durations: [1_800],
        objectives: ['future_return_regression'],
        searchSpaces: [
          { engine: 'ridge', alpha: { values: [1] }, fit_intercept: { values: [true] } },
        ],
        featureStrategies: [{ strategy: 'all' }, { strategy: 'top_k', values: [10] }],
        confidencePercentages: [5, 20],
        feePercentage: 0.1,
        slippagePercentage: 0.05,
        maximumTrials: 40,
        runtimeHours: 1,
        runtimeMinutes: 30,
        seed: 1729,
        notes: '  ',
      }),
    ).toEqual({
      source_screening_run_id: 'run',
      source_screening_result_id: 'result',
      engines: ['ridge'],
      future_durations_seconds: [1_800],
      search_space: [
        { engine: 'ridge', alpha: { values: [1] }, fit_intercept: { values: [true] } },
      ],
      feature_selection: { strategies: [{ strategy: 'all' }, { strategy: 'top_k', values: [10] }] },
      prediction_objectives: ['future_return_regression'],
      confidence_buckets: ['0.05', '0.2'],
      fee_rate: '0.001',
      slippage_rate: '0.0005',
      maximum_trials: 40,
      maximum_runtime_seconds: 5_400,
      deterministic_seed: 1729,
      notes: null,
    });
  });
});
