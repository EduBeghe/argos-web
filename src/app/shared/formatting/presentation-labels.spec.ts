import {
  assetClassLabel,
  decisionActionLabel,
  interpretationLabel,
  marketTypeLabel,
  positionStatusLabel,
} from './presentation-labels';

describe('presentation labels', () => {
  it('maps decision actions', () => {
    expect(decisionActionLabel('no_action')).toBe('Sin cambios');
    expect(decisionActionLabel('open_position')).toBe('Abrir posición');
    expect(decisionActionLabel('increase_position')).toBe('Aumentar posición');
    expect(decisionActionLabel('sell_partial')).toBe('Venta parcial');
    expect(decisionActionLabel('sell_all')).toBe('Cerrar posición');
  });

  it('maps position statuses, interpretations, asset classes, and market types', () => {
    expect(positionStatusLabel('open')).toBe('Abierta');
    expect(positionStatusLabel('closed')).toBe('Cerrada');
    expect(interpretationLabel('bullish')).toBe('Alcista');
    expect(interpretationLabel('bearish')).toBe('Bajista');
    expect(interpretationLabel('neutral')).toBe('Neutral');
    expect(assetClassLabel('crypto')).toBe('Cripto');
    expect(assetClassLabel('equity')).toBe('Acción');
    expect(assetClassLabel('etf')).toBe('ETF');
    expect(marketTypeLabel('spot')).toBe('Spot');
  });

  it('provides a safe, non-empty fallback for future and empty values', () => {
    expect(decisionActionLabel('future_action')).toBe('Future action');
    expect(interpretationLabel('')).toBe('Desconocido');
  });
});
