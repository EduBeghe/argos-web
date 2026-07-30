export const REFINEMENT_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type RefinementStatus = (typeof REFINEMENT_STATUSES)[number];
export type RefinementDisposition =
  | 'queued'
  | 'already_queued'
  | 'already_running'
  | 'reused_completed'
  | 'requeued_failed'
  | 'requeued_cancelled';
export type RefinementClassification =
  'promising_for_strategy_simulation' | 'insufficient_evidence' | 'discarded' | 'incomplete';

export interface RefinementVariable {
  name: string;
  description: string;
  category: string;
  lookback_seconds: number;
  calculation: string;
  calculation_version: number;
  higher_is_directional: boolean | null;
}
export interface RefinementContract {
  contract_version: number;
  classification_version: number;
  variable_registry_version: number;
  missing_data_policy_version: number;
  supported_engines: string[];
  supported_prediction_objectives: string[];
  allowed_future_durations_seconds: number[];
  variables: RefinementVariable[];
  validation_limits: {
    maximum_trials: number;
    maximum_runtime_seconds: number;
    maximum_notes_length: number;
  };
  ui_defaults: { fee_rate: string; slippage_rate: string; deterministic_seed: number };
}
export interface ScreeningRun {
  id: string;
  status: string;
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  screening_version: number;
  dataset_fingerprint: string;
  configuration: Record<string, unknown>;
  completed_at: string | null;
}
export interface ScreeningResult {
  id: string;
  run_id: string;
  engine: string;
  future_duration_seconds: number;
  evidence_classification: string;
  display_rank: number;
  pareto_retained: boolean;
  median_directional_accuracy: string;
  median_pearson_correlation: string | null;
  median_spearman_correlation: string | null;
  median_mae_improvement_over_zero: string;
  failed_classification_rules: string[];
}
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}
export interface RefinementRun {
  id: string;
  experiment_key: string;
  source_screening_run_id: string;
  source_screening_result_id: string;
  status: RefinementStatus | string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  evaluations_selected: number;
  work_completed: number;
  progress_fraction: string | null;
  evaluations_computed: number;
  evaluations_reused: number;
  evaluations_omitted: number;
  budget_exhausted: boolean;
  termination_reason: string | null;
  failure_type: string | null;
  failure_message: string | null;
  elapsed_seconds: string | null;
  cancellation_requested: boolean;
  normalized_configuration: Record<string, unknown>;
  worker_id: string | null;
}
export interface RefinementEvaluation {
  id: string;
  run_id: string;
  reused_from_evaluation_id: string | null;
  engine: string;
  future_duration_seconds: number;
  objective: string;
  feature_policy: FeaturePolicy;
  confidence_buckets: string[];
  aggregate_metrics: Record<string, unknown>;
  classification: RefinementClassification | string;
  failed_rules: string[];
  elapsed_seconds: string;
}
export interface RefinementEvaluationDetail extends RefinementEvaluation {
  fold_evidence: Record<string, unknown>[];
}

export interface ValuesGrid {
  values: (boolean | number)[];
}
export interface RangeGrid {
  minimum: number;
  maximum: number;
  step: number;
}
export type ParameterGrid = ValuesGrid | RangeGrid;
export interface EngineSearchSpace {
  engine: string;
  [parameter: string]: string | ParameterGrid;
}
export interface AllFeaturePolicy {
  strategy: 'all';
}
export interface ExplicitFeaturePolicy {
  strategy: 'explicit';
  variables: string[];
}
export interface TopKFeaturePolicy {
  strategy: 'top_k';
  values: number[];
}
export type FeaturePolicy = AllFeaturePolicy | ExplicitFeaturePolicy | TopKFeaturePolicy;
export interface RefinementRequest {
  source_screening_run_id: string;
  source_screening_result_id: string;
  engines: string[];
  future_durations_seconds: number[];
  search_space: EngineSearchSpace[];
  feature_selection: { strategies: FeaturePolicy[] };
  prediction_objectives: string[];
  confidence_buckets: string[];
  fee_rate: string;
  slippage_rate: string;
  maximum_trials: number;
  maximum_runtime_seconds: number;
  deterministic_seed: number;
  notes: string | null;
}
export interface EnqueueResponse {
  disposition: RefinementDisposition;
  run: RefinementRun;
  location: string;
}
