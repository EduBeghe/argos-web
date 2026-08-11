export type CampaignStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CampaignOutcome =
  | 'coverage_incomplete'
  | 'no_strong_candidate'
  | 'search_budget_exhausted'
  | 'strong_candidates_found';
export type FamilyState =
  'pending' | 'scheduled' | 'survived' | 'discarded' | 'strong_development_candidate';

export interface Page<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface CampaignContract {
  preset: string;
  contract_version: number;
  policy_version: number;
  classification_version: number;
  promotion_policy: string;
  engines: string[];
  future_durations_seconds: number[];
  objectives: string[];
  feature_variants: string[];
  stage_trials: number[];
  confidence_buckets: string[];
  fee_rate: string;
  slippage_rate: string;
  deterministic_seed: number;
  families_per_instrument: number;
  default_maximum_evaluations: number;
  default_maximum_runtime_seconds: number;
}

export interface SearchCampaign {
  id: string;
  experiment_key: string;
  preset: string;
  status: CampaignStatus | string;
  outcome: CampaignOutcome | string | null;
  contract_version: number;
  policy_version: number;
  classification_version: number;
  maximum_evaluations: number;
  maximum_runtime_seconds: number;
  families_total: number;
  families_covered: number;
  families_uncovered: number;
  evaluations_computed: number;
  evaluations_reused: number;
  current_stage: number;
  cancellation_requested_at: string | null;
  first_claimed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_type: string | null;
  failure_message: string | null;
  created_at: string;
}

export interface FamilyBestMetrics {
  observations?: number | null;
  favorable_direction_folds?: number | null;
  positive_net_folds?: number | null;
  folds_beating_benchmark?: number | null;
  median_net_return?: string | null;
  worst_net_return?: string | null;
  round_trips?: number | null;
  inactive_folds?: number | null;
  promising_configurations?: number | null;
  complete_and_finite?: boolean | null;
}

export interface SearchCampaignFamily {
  id: string;
  campaign_id: string;
  source_screening_run_id: string;
  fingerprint: string;
  preset: string;
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  engine: string;
  search_track?: string;
  future_duration_seconds: number;
  objective: string;
  feature_variant: string;
  state: FamilyState | string;
  current_stage: number;
  evaluations_planned: number;
  evaluations_completed: number;
  evaluations_reused: number;
  best_evaluation_id: string | null;
  best_metrics: FamilyBestMetrics | null;
  selected_policy: Record<string, unknown> | null;
  selected_policy_fingerprint: string | null;
  decision_reason: string | null;
  deterministic_ordinal: number;
}

export interface CampaignListFilters {
  status?: string;
  outcome?: string;
  source_screening_run_id?: string;
}

export interface FamilyFilters {
  engine?: string;
  objective?: string;
  feature_strategy?: string;
  minimum_duration_seconds?: number;
  maximum_duration_seconds?: number;
  stage?: number;
  state?: string;
}

export type FamilyCategory = 'strong' | 'competing' | 'near' | 'early' | 'pending';
export type CategoryCounts = Record<FamilyCategory, number | null>;

export interface IntegritySection {
  valid: boolean;
  failure_codes: string[];
  provenance_strength?: string | null;
  [key: string]: unknown;
}

export interface CampaignFamilyAuditResponse {
  campaign_id: string;
  family_id: string;
  evidence_integrity: IntegritySection;
  temporal_provenance_integrity: IntegritySection;
  overall_valid: boolean;
  temporal_manifest?: Record<string, unknown> | null;
  reconstructed_manifest_status?: string | null;
  reconstructed_manifest_id?: string | null;
  winning_evaluation?: Record<string, unknown> | null;
  winning_configuration?: Record<string, unknown> | null;
  independent_sample_diagnostic?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface TemporalManifestResponse {
  id: string;
  status: string;
  source: string;
  manifest_fingerprint: string | null;
  fingerprint_verified: boolean | null;
  counts_verified: boolean | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  completed_at: string | null;
  cancellation_requested_at?: string | null;
  manifest?: Record<string, unknown> | null;
}

export interface FinalValidationResponse {
  id: string;
  campaign_id: string;
  family_id: string;
  status: string;
  classification: string | null;
  frozen_inputs: Record<string, unknown>;
  scenario_metrics: Record<string, unknown> | null;
  execution_manifest: Record<string, unknown> | null;
  failed_rules: string[] | null;
  protected_data_read_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  completed_at: string | null;
  cancellation_requested_at?: string | null;
}

export interface FinalValidationPage {
  items: FinalValidationResponse[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface PaperDeploymentResponse {
  id: string;
  display_name: string;
  status: string;
  strategy_kind: string;
  is_primary: boolean;
  [key: string]: unknown;
}

export const DIAGNOSTIC_QUALIFICATION_PROVENANCE = 'diagnostic_stage3_near_miss';

export interface DiagnosticQualificationRequest {
  family_ids: string[];
}

export interface DiagnosticQualificationEnqueueItem {
  family_id: string;
  qualification_id: string;
  status: string;
  created: boolean;
  reused: boolean;
}

export interface DiagnosticQualificationEnqueueResponse {
  campaign_id: string;
  request_version: number;
  items: DiagnosticQualificationEnqueueItem[];
}

export interface QualificationScenarioMetrics {
  base?: { total_net_return?: string | null; [key: string]: unknown } | null;
  stress_1_5x?: { total_net_return?: string | null; [key: string]: unknown } | null;
  stress_2x?: { total_net_return?: string | null; [key: string]: unknown } | null;
  maximum_drawdown?: string | null;
  round_trips?: number | null;
  [key: string]: unknown;
}

export interface DiagnosticQualification {
  id: string;
  campaign_id: string;
  family_id: string;
  candidate_fingerprint: string;
  policy_fingerprint: string;
  qualification_version: number;
  provenance: string;
  status: string;
  classification: string | null;
  engine: string;
  objective: string;
  search_track: string;
  seed_family_id: string | null;
  frozen_inputs: Record<string, unknown>;
  temporal_manifest: Record<string, unknown>;
  temporal_manifest_fingerprint: string;
  policy_identity: Record<string, unknown>;
  scenario_metrics: QualificationScenarioMetrics | null;
  quarter_returns: string[] | null;
  trades: Record<string, unknown>[] | null;
  failed_rules: string[] | null;
  evidence_end_exclusive: string;
  completed_at: string | null;
  failed_at: string | null;
  failure_type: string | null;
  failure_message: string | null;
  created_at: string;
}

export interface DiagnosticQualificationView {
  id: string;
  campaign_id: string;
  family_id: string;
  provenance: string;
  status: string;
  engine: string;
  objective: string;
  search_track: string;
  future_duration_seconds: number;
  feature_variant: string;
  accepted_at: string | null;
  created_at: string | null;
  completed_at: string | null;
  created: boolean | null;
  reused: boolean | null;
  qualification: DiagnosticQualification | null;
}
