export type DeploymentLifecycle = 'active' | 'paused' | 'archived';
export type StrategyKind = 'baseline' | 'ml_fixed_horizon_long_only';

export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface PaperDeployment {
  id: string;
  display_name: string;
  strategy_kind: StrategyKind | string;
  lifecycle: DeploymentLifecycle | string;
  is_primary: boolean;
  current_cash: string;
  open_position_count: number;
  current_run_id: string | null;
  final_validation_id?: string | null;
  artifact?: {
    id: string;
    format_version: number;
    compression: string;
    byte_length: number;
    sha256: string;
    engine: string;
  } | null;
  created_at: string;
  paused_at: string | null;
  archived_at: string | null;
  [key: string]: unknown;
}

export interface DeploymentFilters {
  status?: string;
  strategy_kind?: string;
  include_archived?: boolean;
  cursor?: string;
  limit?: number;
}

export type DeploymentAction = 'pause' | 'resume' | 'archive' | 'make-primary';
