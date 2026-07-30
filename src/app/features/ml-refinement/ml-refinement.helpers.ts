import {
  EngineSearchSpace,
  RefinementContract,
  RefinementRequest,
  ScreeningResult,
  ScreeningRun,
} from './ml-refinement.models';

export const ENGINE_PARAMETERS: Readonly<Record<string, readonly string[]>> = {
  ridge: ['alpha', 'fit_intercept'],
  lightgbm: [
    'learning_rate',
    'n_estimators',
    'max_depth',
    'num_leaves',
    'min_child_samples',
    'subsample',
    'colsample_bytree',
    'reg_alpha',
    'reg_lambda',
  ],
  catboost: [
    'learning_rate',
    'iterations',
    'depth',
    'l2_leaf_reg',
    'random_strength',
    'bagging_temperature',
  ],
};

// Upstream library defaults used only when screening did not persist a value.
export const MISSING_ENGINE_DEFAULTS: Readonly<
  Record<string, Readonly<Record<string, boolean | number>>>
> = {
  ridge: { fit_intercept: true },
  lightgbm: {
    min_child_samples: 20,
    subsample: 1,
    colsample_bytree: 1,
    reg_alpha: 0,
    reg_lambda: 0,
  },
  catboost: { l2_leaf_reg: 3, random_strength: 1, bagging_temperature: 1 },
};

export interface RefinementFormValue {
  engines: string[];
  durations: number[];
  objectives: string[];
  searchSpaces: EngineSearchSpace[];
  featureStrategies: Record<string, unknown>[];
  confidencePercentages: number[];
  feePercentage: number;
  slippagePercentage: number;
  maximumTrials: number;
  runtimeHours: number;
  runtimeMinutes: number;
  seed: number;
  notes: string;
}

export function formatDuration(seconds: number): string {
  if (seconds % 86_400 === 0) return `${seconds / 86_400}d`;
  if (seconds % 3_600 === 0) return `${seconds / 3_600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

export function decimalFraction(percentage: number): string {
  return (percentage / 100).toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
}

export function serializeRefinementRequest(
  sourceRunId: string,
  sourceResultId: string,
  value: RefinementFormValue,
): RefinementRequest {
  return {
    source_screening_run_id: sourceRunId,
    source_screening_result_id: sourceResultId,
    engines: value.engines,
    future_durations_seconds: value.durations,
    search_space: value.searchSpaces,
    feature_selection: { strategies: value.featureStrategies },
    prediction_objectives: value.objectives,
    confidence_buckets: value.confidencePercentages.map(decimalFraction),
    fee_rate: decimalFraction(value.feePercentage),
    slippage_rate: decimalFraction(value.slippagePercentage),
    maximum_trials: value.maximumTrials,
    maximum_runtime_seconds: value.runtimeHours * 3_600 + value.runtimeMinutes * 60,
    deterministic_seed: value.seed,
    notes: value.notes.trim() || null,
  };
}

export function baselineSearchSpace(
  engine: string,
  configuration: Record<string, unknown>,
): EngineSearchSpace | null {
  const parameters = ENGINE_PARAMETERS[engine];
  if (!parameters) return null;
  const nested = configuration[engine];
  const persisted =
    typeof nested === 'object' && nested !== null
      ? (nested as Record<string, unknown>)
      : configuration;
  const defaults = MISSING_ENGINE_DEFAULTS[engine] ?? {};
  const space: EngineSearchSpace = { engine };
  for (const parameter of parameters) {
    const value = persisted[parameter] ?? defaults[parameter];
    if (typeof value !== 'number' && typeof value !== 'boolean') return null;
    space[parameter] = { values: [value] };
  }
  return space;
}

export function initialFormValue(
  contract: RefinementContract,
  run: ScreeningRun,
  result: ScreeningResult,
): RefinementFormValue | null {
  const space = baselineSearchSpace(result.engine, run.configuration);
  if (!space) return null;
  return {
    engines: [result.engine],
    durations: [result.future_duration_seconds],
    objectives: [...contract.supported_prediction_objectives],
    searchSpaces: [space],
    featureStrategies: [{ strategy: 'all' }],
    confidencePercentages: [5, 10, 20],
    feePercentage: Number(contract.ui_defaults.fee_rate) * 100,
    slippagePercentage: Number(contract.ui_defaults.slippage_rate) * 100,
    maximumTrials: Math.min(40, contract.validation_limits.maximum_trials),
    runtimeHours: Math.floor(
      Math.min(7_200, contract.validation_limits.maximum_runtime_seconds) / 3_600,
    ),
    runtimeMinutes: Math.floor(
      (Math.min(7_200, contract.validation_limits.maximum_runtime_seconds) % 3_600) / 60,
    ),
    seed: contract.ui_defaults.deterministic_seed,
    notes: '',
  };
}

export function cartesianUpperBound(value: RefinementFormValue): number {
  const parameterCount = value.searchSpaces.reduce((product, space) => {
    const size = Object.entries(space)
      .filter(([name]) => name !== 'engine')
      .reduce((inner, [, grid]) => {
        const values = grid as {
          values?: unknown[];
          minimum?: number;
          maximum?: number;
          step?: number;
        };
        const count =
          values.values?.length ??
          (values.minimum !== undefined && values.maximum !== undefined && values.step
            ? Math.floor((values.maximum - values.minimum) / values.step) + 1
            : 0);
        return inner * Math.max(count, 1);
      }, 1);
    return product + size;
  }, 0);
  return (
    parameterCount *
    value.durations.length *
    value.objectives.length *
    value.featureStrategies.length
  );
}
