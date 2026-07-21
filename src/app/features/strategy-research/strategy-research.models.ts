export type CandidateStatus = 'confirmed_candidate' | 'rejected_validation' | 'rejected_test';
export type SuggestedAction = 'long_entry' | 'exit_or_avoid';

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
  instrument: InstrumentIdentity;
  evaluated_count: number;
  candidate_status_counts: StatusCounts;
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
  test_metrics: SegmentMetrics;
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
