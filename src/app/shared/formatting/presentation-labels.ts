const DECISION_ACTION_LABELS: Readonly<Record<string, string>> = {
  no_action: 'Sin cambios',
  open_position: 'Abrir posición',
  increase_position: 'Aumentar posición',
  sell_partial: 'Venta parcial',
  sell_all: 'Cerrar posición',
};

const POSITION_STATUS_LABELS: Readonly<Record<string, string>> = {
  open: 'Abierta',
  closed: 'Cerrada',
};

const INTERPRETATION_LABELS: Readonly<Record<string, string>> = {
  bullish: 'Alcista',
  bearish: 'Bajista',
  neutral: 'Neutral',
};

const ASSET_CLASS_LABELS: Readonly<Record<string, string>> = {
  crypto: 'Cripto',
  equity: 'Acción',
  etf: 'ETF',
};

const MARKET_TYPE_LABELS: Readonly<Record<string, string>> = {
  spot: 'Spot',
};

function fallbackLabel(value: string): string {
  const normalized = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (!normalized) {
    return 'Desconocido';
  }
  return normalized.charAt(0).toLocaleUpperCase('es-AR') + normalized.slice(1);
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
