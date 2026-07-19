export type EvaluationStatus = 'available' | 'unavailable';
export type EvaluationUnavailableReason =
  | 'no_equity_snapshot'
  | 'no_decision_universe'
  | 'missing_compatible_candle'
  | 'incomplete_candle_evidence'
  | 'strategy_or_benchmark_unavailable'
  | (string & {});
export type BenchmarkMethod = 'equal_weight_buy_and_hold_v1' | (string & {});

export interface EvaluationIdentity {
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
}

export interface PaperEvaluationRun {
  run_id: string;
  status: string;
  account_currency: string;
  configuration_version: number;
  evaluated_from: string;
  evaluated_until: string;
  latest_snapshot_id: string | null;
  snapshot_count: number;
}

export interface PaperStrategyEvaluation {
  status: EvaluationStatus;
  unavailable_reason: EvaluationUnavailableReason | null;
  initial_equity: string;
  ending_equity: string | null;
  absolute_pnl: string | null;
  total_return: string | null;
  current_drawdown: string | null;
  max_drawdown: string | null;
  realized_gross_pnl: string | null;
  realized_net_pnl: string | null;
  unrealized_pnl: string | null;
  fees_paid: string | null;
  estimated_slippage_cost: string | null;
  decision_count: number;
  decision_counts_by_action: Record<string, number>;
  trade_count: number;
  trade_counts_by_side: Record<string, number>;
  open_position_count: number;
  closed_position_count: number;
  winning_position_count: number;
  losing_position_count: number;
  breakeven_position_count: number;
  win_rate: string | null;
  average_win: string | null;
  average_loss: string | null;
  profit_factor: string | null;
}

export interface BenchmarkInstrument extends EvaluationIdentity {
  status: EvaluationStatus;
  unavailable_reason: EvaluationUnavailableReason | null;
  allocation: string;
  entry_candle_open_time: string | null;
  entry_observed_price: string | null;
  entry_execution_price: string | null;
  quantity: string | null;
  entry_fee: string | null;
  estimated_entry_slippage_cost: string | null;
  ending_candle_open_time: string | null;
  ending_mark_price: string | null;
  ending_market_value: string | null;
  absolute_pnl: string | null;
  total_return: string | null;
}

export interface PaperBenchmarkEvaluation {
  status: EvaluationStatus;
  unavailable_reason: EvaluationUnavailableReason | null;
  method: BenchmarkMethod;
  instrument_count: number;
  initial_equity: string;
  ending_asset_value: string | null;
  remaining_cash: string | null;
  ending_equity: string | null;
  absolute_pnl: string | null;
  total_return: string | null;
  entry_fees: string | null;
  entry_slippage_cost: string | null;
  instruments: BenchmarkInstrument[];
}

export interface PaperEvaluationComparison {
  status: EvaluationStatus;
  unavailable_reason: EvaluationUnavailableReason | null;
  strategy_excess_return: string | null;
  strategy_minus_benchmark_pnl: string | null;
}

export interface PaperInstrumentEvaluation extends EvaluationIdentity {
  decision_count: number;
  decision_counts_by_action: Record<string, number>;
  trade_count: number;
  trade_counts_by_side: Record<string, number>;
  fees_paid: string;
  estimated_slippage_cost: string;
  open_position_count: number;
  closed_position_count: number;
  realized_gross_pnl: string;
  realized_net_pnl: string;
  unrealized_pnl: string | null;
}

export interface PaperEvaluationResponse {
  run: PaperEvaluationRun;
  strategy: PaperStrategyEvaluation;
  benchmark: PaperBenchmarkEvaluation;
  comparison: PaperEvaluationComparison;
  instruments: PaperInstrumentEvaluation[];
}
