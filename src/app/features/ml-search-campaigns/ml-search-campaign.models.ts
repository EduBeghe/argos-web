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
  promising_configurations?: number | null;
  complete_and_finite?: boolean | null;
}

export interface SearchCampaignFamily {
  id: string;
  campaign_id: string;
  source_screening_run_id: string;
  fingerprint: string;
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  engine: string;
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
