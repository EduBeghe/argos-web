import {
  baselineSearchSpace,
  cartesianUpperBound,
  formatDuration,
  parseParameterGrid,
  serializeRefinementRequest,
  validContract,
} from './ml-refinement.helpers';

describe('ML refinement helpers', () => {
  it('formats exact durations without hiding seconds', () => {
    expect(formatDuration(1_800)).toBe('30m');
    expect(formatDuration(14_400)).toBe('4h');
    expect(formatDuration(86_400)).toBe('1d');
  });

  it('enforces typed values and mutually exclusive inclusive ranges', () => {
    expect(
      parseParameterGrid('ridge', 'fit_intercept', {
        mode: 'values',
        values: 'true, false',
        minimum: '',
        maximum: '',
        step: '',
      }).value,
    ).toEqual({ values: [true, false] });
    expect(
      parseParameterGrid('ridge', 'fit_intercept', {
        mode: 'range',
        values: '',
        minimum: '0',
        maximum: '1',
        step: '1',
      }).error,
    ).toContain('Boolean');
    expect(
      parseParameterGrid('lightgbm', 'n_estimators', {
        mode: 'values',
        values: '10.5',
        minimum: '',
        maximum: '',
        step: '',
      }).error,
    ).toContain('integers');
    expect(
      parseParameterGrid('lightgbm', 'subsample', {
        mode: 'values',
        values: '0, 1.1',
        minimum: '',
        maximum: '',
        step: '',
      }).error,
    ).toBeTruthy();
    expect(
      parseParameterGrid('catboost', 'l2_leaf_reg', {
        mode: 'range',
        values: '',
        minimum: '0',
        maximum: '2',
        step: '0.5',
      }).value,
    ).toEqual({ minimum: 0, maximum: 2, step: 0.5 });
    expect(
      parseParameterGrid('catboost', 'depth', {
        mode: 'range',
        values: '',
        minimum: '5',
        maximum: '2',
        step: '1',
      }).error,
    ).toContain('Minimum');
  });

  it('validates required contract scalars and unique authoritative options', () => {
    const contract = {
      contract_version: 1,
      classification_version: 1,
      variable_registry_version: 1,
      missing_data_policy_version: 1,
      supported_engines: ['ridge'],
      supported_prediction_objectives: ['future_return_regression'],
      allowed_future_durations_seconds: [1800],
      variables: [
        {
          name: 'return_1',
          description: 'Return',
          category: 'return',
          lookback_seconds: 300,
          calculation: 'close return',
          calculation_version: 1,
          higher_is_directional: true,
        },
      ],
      validation_limits: {
        maximum_trials: 40,
        maximum_runtime_seconds: 7200,
        maximum_notes_length: 1000,
      },
      ui_defaults: { fee_rate: '0.001', slippage_rate: '0.0005', deterministic_seed: 1729 },
    };
    expect(validContract(contract)).toBe(true);
    expect(validContract({ ...contract, supported_engines: ['ridge', 'ridge'] })).toBe(false);
    expect(
      validContract({
        ...contract,
        validation_limits: { ...contract.validation_limits, maximum_trials: 0 },
      }),
    ).toBe(false);
  });

  it('calculates the complete multi-engine Cartesian upper bound and rejects unsafe ranges', () => {
    const base = {
      engines: ['ridge', 'catboost'],
      durations: [1800, 3600],
      objectives: ['a', 'b'],
      featureStrategies: [
        { strategy: 'all' as const },
        { strategy: 'top_k' as const, values: [5] },
      ],
      confidencePercentages: [5],
      feePercentage: 0.1,
      slippagePercentage: 0.05,
      maximumTrials: 40,
      runtimeHours: 1,
      runtimeMinutes: 0,
      seed: 1,
      notes: '',
    };
    expect(
      cartesianUpperBound({
        ...base,
        searchSpaces: [
          { engine: 'ridge', alpha: { values: [1, 2] }, fit_intercept: { values: [true] } },
          {
            engine: 'catboost',
            depth: { minimum: 2, maximum: 4, step: 1 },
            iterations: { values: [50, 100] },
          },
        ],
      }),
    ).toBe((2 + 6) * 2 * 2 * 2);
    expect(
      cartesianUpperBound({
        ...base,
        searchSpaces: [{ engine: 'ridge', alpha: { minimum: 2, maximum: 1, step: 1 } }],
      }),
    ).toBeNull();
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
