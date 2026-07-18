export type DecimalString = string;
export type IsoUtcString = string;

export interface DashboardOverview {
  generated_at: IsoUtcString;
  system: DashboardSystem;
  paper: DashboardPaper;
  instruments: MarketInstrumentCard[];
}

export interface DashboardSystem {
  market_data_fresh: boolean;
  instruments_total: number;
  instruments_fresh: number;
}

export interface DashboardPaper {
  run: PaperRun | null;
  portfolio: PaperPortfolio | null;
  performance: PaperPerformance | null;
}

export interface MarketInstrumentCard {
  instrument: InstrumentDefinition;
  market_status: MarketStatus | null;
  latest_score: MarketScore | null;
  latest_decision: DecisionSnapshot | null;
  open_position: PaperPosition | null;
}

export interface InstrumentDefinition {
  asset: string;
  display_symbol: string;
  display_name: string;
  asset_class: string;
  base_currency: string;
  quote_currency: string;
  provider: string;
  provider_symbol: string;
  market_type: string;
  interval: string;
  capabilities: InstrumentCapabilities;
  display_order: number;
}

export interface InstrumentCapabilities {
  ingestion: boolean;
  scoring: boolean;
  decision: boolean;
  paper_trading: boolean;
}

export interface MarketStatus {
  asset: string;
  interval: string;
  candle_count: number;
  latest_open_time: IsoUtcString | null;
  latest_close_time: IsoUtcString | null;
  latest_ingested_at: IsoUtcString | null;
  age_seconds: number | null;
  is_fresh: boolean;
}

export interface MarketScore {
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  candle_open_time: IsoUtcString;
  calculated_at: IsoUtcString;
  model_name: string;
  model_version: number;
  trend_score: DecimalString;
  momentum_score: DecimalString;
  volume_activity: DecimalString;
  volatility_ratio: DecimalString;
  directional_score: DecimalString;
  volume_confirmation_factor: DecimalString;
  overall_score: DecimalString;
  signal_strength: DecimalString;
  interpretation: string;
  contributions: ScoreContributions;
  explanations: ScoreExplanations;
}

export interface ScoreContributions {
  trend: DecimalString;
  rsi: DecimalString;
  return_1: DecimalString;
  return_12: DecimalString;
}

export interface ScoreExplanations {
  trend: string;
  momentum: string;
  volume: string;
  volatility: string;
}

export interface DecisionSnapshot {
  id: string;
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  decision_timestamp: IsoUtcString;
  source_candle_open_time: IsoUtcString;
  source_market_price: DecimalString;
  source_score_id: string;
  source_score_model_name: string;
  source_score_model_version: number;
  source_overall_score: DecimalString;
  strategy_name: string;
  strategy_version: number;
  configuration_version: number;
  action: string;
  requested_target_portfolio_percentage: DecimalString | null;
  requested_position_percentage: DecimalString | null;
  applied_rule: string;
  explanation: string;
  position_is_open: boolean;
}

export interface PaperRun {
  id: string;
  status: string;
  account_currency: string;
  initial_cash: DecimalString;
  current_cash: DecimalString;
  configuration_version: number;
  fee_rate: DecimalString;
  slippage_rate: DecimalString;
  started_at: IsoUtcString;
  stopped_at: IsoUtcString | null;
  stop_reason: string | null;
  predecessor_run_id: string | null;
}

export interface PaperPortfolio {
  run_id: string;
  status: string;
  account_currency: string;
  initial_cash: DecimalString;
  current_cash: DecimalString;
  positions_market_value: DecimalString;
  equity: DecimalString;
  total_pnl: DecimalString;
  total_return: DecimalString | null;
  valued_at: IsoUtcString;
  positions: ValuedPaperPosition[];
}

export interface ValuedPaperPosition {
  position_id: string;
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  quantity: DecimalString;
  average_entry_price: DecimalString;
  cost_basis: DecimalString;
  mark_price: DecimalString;
  market_value: DecimalString;
  unrealized_pnl: DecimalString;
  unrealized_return: DecimalString | null;
  mark_candle_open_time: IsoUtcString;
}

export interface PaperPerformance {
  run_id: string;
  status: string;
  account_currency: string;
  snapshot_count: number;
  initial_equity: DecimalString;
  latest_equity: DecimalString;
  absolute_pnl: DecimalString;
  total_return: DecimalString | null;
  peak_equity: DecimalString;
  lowest_equity: DecimalString;
  current_drawdown: DecimalString;
  max_drawdown: DecimalString;
  first_snapshot_boundary: IsoUtcString | null;
  latest_snapshot_boundary: IsoUtcString | null;
  evaluated_from: IsoUtcString;
  evaluated_until: IsoUtcString;
}

export interface PaperPosition {
  id: string;
  run_id: string;
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  status: string;
  quantity: DecimalString;
  average_entry_price: DecimalString;
  total_entry_notional: DecimalString;
  accumulated_entry_fees: DecimalString;
  opened_at: IsoUtcString;
  closed_at: IsoUtcString | null;
  exit_price: DecimalString | null;
  gross_realized_pnl: DecimalString | null;
  net_realized_pnl: DecimalString | null;
}
