import {
  DecisionSnapshot,
  InstrumentDefinition,
  IsoUtcString,
  MarketInstrumentCard,
  MarketScore,
  ValuedPaperPosition,
} from '../dashboard/dashboard.models';

export type HistoryRange = '6h' | '24h' | '72h';
export type CollectionState = 'loading' | 'empty' | 'error' | 'success';

export interface InstrumentIdentity {
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
}

export interface MarketCandle {
  id: string;
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  open_time: IsoUtcString;
  close_time: IsoUtcString;
  open_price: string;
  high_price: string;
  low_price: string;
  close_price: string;
  base_asset_volume: string;
  quote_asset_volume: string;
  trade_count: number;
  taker_buy_base_asset_volume: string;
  taker_buy_quote_asset_volume: string;
  ingested_at: IsoUtcString;
}

export interface PaperTrade {
  id: string;
  run_id: string;
  decision_snapshot_id: string;
  position_id: string;
  side: string;
  asset: string;
  provider: string;
  market_type: string;
  interval: string;
  observed_market_price: string;
  slippage_rate: string;
  execution_price: string;
  quantity: string;
  executed_notional: string;
  fee_rate: string;
  fee_amount: string;
  cash_impact: string;
  executed_at: IsoUtcString;
  configuration_version: number;
  equity_before: string | null;
}

export interface HistoricalCollection<T> {
  state: CollectionState;
  data: T[];
  message: string | null;
}

export interface InstrumentContext {
  definition: InstrumentDefinition;
  card: MarketInstrumentCard | null;
  position: ValuedPaperPosition | null;
}

export type { DecisionSnapshot, MarketScore };
