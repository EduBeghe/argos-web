const DECISION_ACTION_LABELS: Readonly<Record<string, string>> = {
  no_action: 'No action',
  open_position: 'Open position',
  increase_position: 'Increase position',
  sell_partial: 'Partial sale',
  sell_all: 'Close position',
};

const POSITION_STATUS_LABELS: Readonly<Record<string, string>> = {
  open: 'Open',
  closed: 'Closed',
};

const INTERPRETATION_LABELS: Readonly<Record<string, string>> = {
  strongly_bearish: 'Strongly bearish',
  bearish: 'Bearish',
  neutral: 'Neutral',
  bullish: 'Bullish',
  strongly_bullish: 'Strongly bullish',
};

const ASSET_CLASS_LABELS: Readonly<Record<string, string>> = {
  crypto: 'Crypto',
  equity: 'Equity',
  etf: 'ETF',
};

const MARKET_TYPE_LABELS: Readonly<Record<string, string>> = {
  spot: 'Spot',
};

const PAPER_RUN_STATUS_LABELS: Readonly<Record<string, string>> = {
  active: 'Active run',
  stopped: 'Stopped run',
};

function fallbackLabel(value: string): string {
  const normalized = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (!normalized) {
    return 'Unknown';
  }
  return normalized.charAt(0).toLocaleUpperCase('en-US') + normalized.slice(1);
}

function presentationLabel(value: string, labels: Readonly<Record<string, string>>): string {
  return labels[value] ?? fallbackLabel(value);
}

export function decisionActionLabel(value: string): string {
  return presentationLabel(value, DECISION_ACTION_LABELS);
}

export function positionStatusLabel(value: string): string {
  return presentationLabel(value, POSITION_STATUS_LABELS);
}

export function interpretationLabel(value: string): string {
  return presentationLabel(value, INTERPRETATION_LABELS);
}

export function assetClassLabel(value: string): string {
  return presentationLabel(value, ASSET_CLASS_LABELS);
}

export function marketTypeLabel(value: string): string {
  return presentationLabel(value, MARKET_TYPE_LABELS);
}

export function paperRunStatusLabel(value: string): string {
  return presentationLabel(value, PAPER_RUN_STATUS_LABELS);
}
