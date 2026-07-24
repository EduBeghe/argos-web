export type CandidateStatus = 'confirmed_candidate' | 'rejected_validation' | 'rejected_test';
export type TargetedCandidateStatus =
  'rejected_training' | 'rejected_validation' | 'rejected_test' | 'confirmed_candidate';
export type SuggestedAction = 'long_entry' | 'exit_or_avoid';
export type NearMissKind = 'actionable' | 'diagnostic';

export interface InstrumentIdentity {
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
}

export interface StatusCounts {
  confirmed_candidate: number;
  rejected_validation: number;
  rejected_test: number;
}

export interface EdgeGuidedRun {
  id: string;
  predictive_edge_run_id: string;
  status: 'running' | 'completed' | 'failed';
  instrument: InstrumentIdentity;
  range_start: string;
  range_end: string;
  fee_rate: string;
  slippage_rate: string;
  legacy: boolean;
  generated_count: number;
  evaluated_count: number;
  windows_available: number;
  started_at: string;
  completed_at: string | null;
  candidate_status_counts: StatusCounts;
  research_outcome: string | null;
  outcome_explanation: string | null;
  funnel: Record<string, number> | null;
  timings: Record<string, string> | null;
}

export interface RunPage {
  items: EdgeGuidedRun[];
  total: number;
  limit: number;
  offset: number;
}

export interface SegmentMetrics {
  segment: 'training' | 'validation' | 'test';
  total_return: string;
  max_drawdown: string;
  trade_count: number;
  fees_paid: string;
  return_difference_from_production: string;
  return_difference_from_buy_and_hold: string;
}

export interface CandidateSummary {
  candidate_evaluation_id: string;
  run_id: string;
  candidate_fingerprint: string;
  source_hypothesis_id: string;
  source_edge_fingerprint: string;
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  dataset_fingerprint: string;
  range_start: string;
  range_end: string;
  predictor_name: string;
  predictor_version: number;
  hypothesis_contract_version: number;
  condition: string;
  lower_bound: string | null;
  upper_bound: string | null;
  suggested_action: SuggestedAction;
  horizon_seconds: number;
  decision_interval_seconds: number;
  direction_mapping: string;
  score_model_name: string;
  score_model_version: number;
  strategy_name: string;
  strategy_version: number;
  strategy_configuration_version: number;
  account_currency: string;
  fee_rate: string;
  slippage_rate: string;
  status: CandidateStatus;
  explanation: string;
  unconditional_benchmark: string;
  valid_window_count: number;
  confirmed_window_count: number;
  rejected_validation_window_count: number;
  rejected_test_window_count: number;
  training_metrics: SegmentMetrics;
  validation_metrics: SegmentMetrics;
  test_metrics: SegmentMetrics | null;
}

export interface WindowEvidence {
  window_ordinal: number;
  volatility_threshold: string;
  training_metrics: SegmentMetrics;
  validation_metrics: SegmentMetrics;
  test_metrics: SegmentMetrics | null;
  validation_passed: boolean;
  test_confirmed: boolean;
}

export interface CandidateDetail extends CandidateSummary {
  windows: WindowEvidence[];
}

export interface CandidatePage {
  items: CandidateSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CandidateFilters {
  instrument: InstrumentIdentity | null;
  status: CandidateStatus | null;
  action: SuggestedAction | null;
  predictor: string;
  condition: string;
}

export interface AuditedParameter {
  name: string;
  value: string;
  source: string;
  rationale: string;
  contract_version: number;
}

export interface PredictiveDiagnostics {
  contract_version: number;
  effective_parameters: AuditedParameter[];
  rejection_counts_by_reason: Record<string, number>;
  rejection_counts_by_predictor: Record<string, number>;
  rejection_counts_by_horizon: Record<string, number>;
  rejection_counts_by_cadence: Record<string, number>;
  rejection_counts_by_condition: Record<string, number>;
  rejection_counts_by_neutral_policy: Record<string, number>;
  strongest_observed_signal: string | null;
  bottleneck_stage: string;
  diagnostic_conclusion: string;
  outcome_explanation: string;
  stage_timings: Record<string, string>;
  computed_counts: Record<string, number>;
  reused_counts: Record<string, number>;
  regime_conditioned_conclusion: string | null;
  regime_conditioned_stage_counters: Record<string, number> | null;
}

export interface RequirementMargin {
  requirement: string;
  observed_value: string;
  required_value: string;
  absolute_margin: string;
  relative_margin: string | null;
  passed: boolean;
}

export interface RegimeEvidence {
  observations: number;
  gross_movement: string | null;
  aligned_gross_movement: string | null;
  net_movement: string | null;
  directional_hit_rate: string | null;
  benchmark: string | null;
  benchmark_improvement: string | null;
  stable: boolean;
  economic: boolean;
  passes: boolean;
  usable_window_count: number;
  confirmed_window_count: number;
}

export interface NearMiss {
  id: string;
  rank: number;
  engine: string;
  engine_contract_version: number;
  kind: string;
  directional_predictor: string | null;
  context_predictor: string | null;
  context_regime: string | null;
  cadence_seconds: number;
  horizon_seconds: number;
  suggested_action: string | null;
  classification: string;
  primary_rejection_reason: string;
  passed_requirements: string[];
  failed_requirements: string[];
  requirement_margins: RequirementMargin[];
  usable_observations: number;
  usable_window_count: number | null;
  expected_net_movement: string | null;
  directional_hit_rate: string | null;
  benchmark_improvement: string | null;
  normalized_missing_distance: string;
  training_evidence: RegimeEvidence | null;
  validation_evidence: RegimeEvidence | null;
  test_evidence: RegimeEvidence | null;
}

export interface NearMissPage {
  items: NearMiss[];
  next_cursor: number | null;
  has_more: boolean;
}

export interface ThresholdSensitivity {
  threshold_name: string;
  current_value: string;
  nearest_passing_value: string;
  candidate_would_advance: boolean;
  other_requirements_still_failed: string[];
}

export interface NearMissDetail {
  near_miss: NearMiss;
  sensitivity: ThresholdSensitivity[];
}

export interface TargetedRefinementSummary {
  id: string;
  predictive_edge_run_id: string;
  conclusion: string;
  summary: Record<string, unknown>;
  confirmed_candidate_count: number;
  best_targeted_candidate_id: string | null;
  best_targeted_candidate: string | null;
}

export interface TargetedConfiguration {
  predictor_name: string;
  context_predictor_name: string;
  context_regime: string;
  horizon: number;
  decision_interval: number;
  cadence: number;
  minimum_holding_period: number;
  maximum_holding_period: number;
  cooldown: number;
  fee_rate: string;
  slippage_rate: string;
}

export interface TargetedCandidate {
  id: string;
  candidate_fingerprint: string;
  seed_fingerprint: string;
  status: TargetedCandidateStatus;
  normalized_distance: string;
  configuration: TargetedConfiguration;
  training_metrics: SegmentMetrics | null;
  validation_metrics: SegmentMetrics | null;
  test_metrics: SegmentMetrics | null;
  passed_requirements: string[];
  failed_requirements: string[];
  requirement_margins: RequirementMargin[];
  rejection_reason: string | null;
}

export interface TargetedCandidateDetail extends TargetedCandidate {
  run_id: string;
}

export interface TargetedCandidatePage {
  items: TargetedCandidate[];
  total: number;
  next_cursor: string | null;
  has_more: boolean;
}
