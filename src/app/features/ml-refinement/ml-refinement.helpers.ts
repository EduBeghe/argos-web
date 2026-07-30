import {
  EngineSearchSpace,
  FeaturePolicy,
  ParameterGrid,
  RefinementContract,
  RefinementRequest,
  ScreeningResult,
  ScreeningRun,
} from './ml-refinement.models';

export type ParameterMode = 'values' | 'range';
export interface ParameterDraft {
  mode: ParameterMode;
  values: string;
  minimum: string;
  maximum: string;
  step: string;
}
export interface EngineDraft {
  engine: string;
  parameters: Record<string, ParameterDraft>;
}
interface ParameterRule {
  kind: 'boolean' | 'integer' | 'number';
  minimum?: number;
  exclusiveMinimum?: boolean;
  maximum?: number;
}

export const PARAMETER_RULES: Readonly<Record<string, Readonly<Record<string, ParameterRule>>>> = {
  ridge: {
    alpha: { kind: 'number', minimum: 0, exclusiveMinimum: true },
    fit_intercept: { kind: 'boolean' },
  },
  lightgbm: {
    learning_rate: { kind: 'number', minimum: 0, exclusiveMinimum: true },
    n_estimators: { kind: 'integer', minimum: 1 },
    max_depth: { kind: 'integer', minimum: -1 },
    num_leaves: { kind: 'integer', minimum: 1 },
    min_child_samples: { kind: 'integer', minimum: 1 },
    subsample: { kind: 'number', minimum: 0, exclusiveMinimum: true, maximum: 1 },
    colsample_bytree: { kind: 'number', minimum: 0, exclusiveMinimum: true, maximum: 1 },
    reg_alpha: { kind: 'number', minimum: 0 },
    reg_lambda: { kind: 'number', minimum: 0 },
  },
  catboost: {
    learning_rate: { kind: 'number', minimum: 0, exclusiveMinimum: true },
    iterations: { kind: 'integer', minimum: 1 },
    depth: { kind: 'integer', minimum: 1 },
    l2_leaf_reg: { kind: 'number', minimum: 0 },
    random_strength: { kind: 'number', minimum: 0 },
    bagging_temperature: { kind: 'number', minimum: 0 },
  },
};
export const ENGINE_PARAMETERS = Object.fromEntries(
  Object.entries(PARAMETER_RULES).map(([engine, rules]) => [engine, Object.keys(rules)]),
) as Readonly<Record<string, readonly string[]>>;
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
  featureStrategies: FeaturePolicy[];
  confidencePercentages: number[];
  feePercentage: number;
  slippagePercentage: number;
  maximumTrials: number;
  runtimeHours: number;
  runtimeMinutes: number;
  seed: number;
  notes: string;
}
export interface ParseResult<T> {
  value: T | null;
  error: string | null;
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
export function unique<T>(items: readonly T[]): boolean {
  return new Set(items).size === items.length;
}

export function validContract(contract: RefinementContract): boolean {
  const scalarValid =
    Number.isInteger(contract.contract_version) &&
    contract.contract_version > 0 &&
    Number.isInteger(contract.classification_version) &&
    contract.classification_version > 0 &&
    Number.isInteger(contract.variable_registry_version) &&
    contract.variable_registry_version > 0 &&
    Number.isInteger(contract.missing_data_policy_version) &&
    contract.missing_data_policy_version > 0 &&
    Number.isInteger(contract.validation_limits.maximum_trials) &&
    contract.validation_limits.maximum_trials >= 1 &&
    Number.isInteger(contract.validation_limits.maximum_runtime_seconds) &&
    contract.validation_limits.maximum_runtime_seconds >= 1 &&
    Number.isInteger(contract.validation_limits.maximum_notes_length) &&
    contract.validation_limits.maximum_notes_length >= 0 &&
    Number.isInteger(contract.ui_defaults.deterministic_seed) &&
    finiteFraction(contract.ui_defaults.fee_rate) &&
    finiteFraction(contract.ui_defaults.slippage_rate);
  return Boolean(
    scalarValid &&
    contract.supported_engines.length &&
    contract.supported_prediction_objectives.length &&
    contract.allowed_future_durations_seconds.length &&
    contract.variables.length &&
    unique(contract.supported_engines) &&
    unique(contract.supported_prediction_objectives) &&
    unique(contract.allowed_future_durations_seconds) &&
    unique(contract.variables.map((item) => item.name)) &&
    contract.allowed_future_durations_seconds.every((item) => Number.isInteger(item) && item > 0),
  );
}
function finiteFraction(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1;
}

export function parseParameterGrid(
  engine: string,
  parameter: string,
  draft: ParameterDraft,
): ParseResult<ParameterGrid> {
  const rule = PARAMETER_RULES[engine]?.[parameter];
  if (!rule) return { value: null, error: 'Unsupported parameter.' };
  if (draft.mode === 'range' && rule.kind === 'boolean')
    return { value: null, error: 'Boolean parameters support Values mode only.' };
  if (draft.mode === 'values') {
    const tokens = draft.values.split(',').map((item) => item.trim());
    if (!tokens.length || tokens.some((item) => !item))
      return { value: null, error: 'Enter one or more comma-separated values.' };
    const parsed = tokens.map((token) => parseScalar(token, rule));
    const error = parsed.find((item) => item.error)?.error;
    if (error) return { value: null, error };
    const values = parsed.map((item) => item.value as boolean | number);
    if (!unique(values.map(String))) return { value: null, error: 'Values must be unique.' };
    return { value: { values }, error: null };
  }
  if (!draft.minimum.trim() || !draft.maximum.trim() || !draft.step.trim())
    return { value: null, error: 'Minimum, maximum, and step are all required.' };
  const minimum = parseScalar(draft.minimum, rule);
  const maximum = parseScalar(draft.maximum, rule);
  const step = Number(draft.step);
  if (minimum.error || maximum.error) return { value: null, error: minimum.error ?? maximum.error };
  if (!Number.isFinite(step) || step <= 0 || (rule.kind === 'integer' && !Number.isInteger(step)))
    return {
      value: null,
      error:
        rule.kind === 'integer' ? 'Step must be a positive integer.' : 'Step must be positive.',
    };
  if ((minimum.value as number) > (maximum.value as number))
    return { value: null, error: 'Minimum must not exceed maximum.' };
  return {
    value: { minimum: minimum.value as number, maximum: maximum.value as number, step },
    error: null,
  };
}
function parseScalar(text: string, rule: ParameterRule): ParseResult<boolean | number> {
  if (rule.kind === 'boolean') {
    if (text === 'true') return { value: true, error: null };
    if (text === 'false') return { value: false, error: null };
    return { value: null, error: 'Use true or false.' };
  }
  const value = Number(text);
  if (!Number.isFinite(value)) return { value: null, error: 'Enter a finite number.' };
  if (rule.kind === 'integer' && !Number.isInteger(value))
    return { value: null, error: 'Enter integers only.' };
  if (
    rule.minimum !== undefined &&
    (rule.exclusiveMinimum ? value <= rule.minimum : value < rule.minimum)
  )
    return {
      value: null,
      error: rule.exclusiveMinimum
        ? `Value must be greater than ${rule.minimum}.`
        : `Value must be at least ${rule.minimum}.`,
    };
  if (rule.maximum !== undefined && value > rule.maximum)
    return { value: null, error: `Value must not exceed ${rule.maximum}.` };
  return { value, error: null };
}

export function baselineEngineDraft(
  engine: string,
  configuration: Record<string, unknown>,
): EngineDraft | null {
  const parameters = ENGINE_PARAMETERS[engine];
  if (!parameters) return null;
  const nested = configuration[engine];
  const persisted =
    typeof nested === 'object' && nested !== null
      ? (nested as Record<string, unknown>)
      : configuration;
  const defaults = MISSING_ENGINE_DEFAULTS[engine] ?? {};
  const draft: EngineDraft = { engine, parameters: {} };
  for (const parameter of parameters) {
    const value = persisted[parameter] ?? defaults[parameter];
    if (typeof value !== 'number' && typeof value !== 'boolean') return null;
    draft.parameters[parameter] = {
      mode: 'values',
      values: String(value),
      minimum: '',
      maximum: '',
      step: '',
    };
  }
  return draft;
}
export function serializeEngineDraft(draft: EngineDraft): ParseResult<EngineSearchSpace> {
  const space: EngineSearchSpace = { engine: draft.engine };
  for (const parameter of ENGINE_PARAMETERS[draft.engine] ?? []) {
    const result = parseParameterGrid(draft.engine, parameter, draft.parameters[parameter]);
    if (!result.value) return { value: null, error: `${parameter}: ${result.error}` };
    space[parameter] = result.value;
  }
  return { value: space, error: null };
}
export function baselineSearchSpace(
  engine: string,
  configuration: Record<string, unknown>,
): EngineSearchSpace | null {
  const draft = baselineEngineDraft(engine, configuration);
  return draft ? serializeEngineDraft(draft).value : null;
}
export function initialFormValue(
  contract: RefinementContract,
  run: ScreeningRun,
  result: ScreeningResult,
): RefinementFormValue | null {
  const space = baselineSearchSpace(result.engine, run.configuration);
  if (!space) return null;
  const seconds = Math.min(7_200, contract.validation_limits.maximum_runtime_seconds);
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
    runtimeHours: Math.floor(seconds / 3_600),
    runtimeMinutes: Math.floor((seconds % 3_600) / 60),
    seed: contract.ui_defaults.deterministic_seed,
    notes: '',
  };
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
export function parameterGridCount(grid: ParameterGrid): number | null {
  if ('values' in grid) return grid.values.length || null;
  if (
    !Number.isFinite(grid.minimum) ||
    !Number.isFinite(grid.maximum) ||
    !Number.isFinite(grid.step) ||
    grid.step <= 0 ||
    grid.minimum > grid.maximum
  )
    return null;
  const count = Math.floor((grid.maximum - grid.minimum) / grid.step + 1e-12) + 1;
  return Number.isSafeInteger(count) && count > 0 ? count : null;
}
export function cartesianUpperBound(value: RefinementFormValue): number | null {
  let engineTotal = 0;
  for (const space of value.searchSpaces) {
    let engineCount = 1;
    for (const [name, grid] of Object.entries(space)) {
      if (name === 'engine') continue;
      const count = parameterGridCount(grid as ParameterGrid);
      if (count === null || !Number.isSafeInteger(engineCount * count)) return null;
      engineCount *= count;
    }
    if (!Number.isSafeInteger(engineTotal + engineCount)) return null;
    engineTotal += engineCount;
  }
  const total =
    engineTotal * value.durations.length * value.objectives.length * value.featureStrategies.length;
  return Number.isSafeInteger(total) ? total : null;
}
