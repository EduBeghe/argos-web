import {
  assetClassLabel,
  decisionActionLabel,
  interpretationLabel,
  marketTypeLabel,
  paperRunStatusLabel,
  positionStatusLabel,
} from './presentation-labels';

describe('presentation labels', () => {
  it('maps decision actions', () => {
    expect(decisionActionLabel('no_action')).toBe('No action');
    expect(decisionActionLabel('open_position')).toBe('Open position');
    expect(decisionActionLabel('increase_position')).toBe('Increase position');
    expect(decisionActionLabel('sell_partial')).toBe('Partial sale');
    expect(decisionActionLabel('sell_all')).toBe('Close position');
  });

  it('maps position statuses, interpretations, asset classes, and market types', () => {
    expect(positionStatusLabel('open')).toBe('Open');
    expect(positionStatusLabel('closed')).toBe('Closed');
    expect(interpretationLabel('strongly_bearish')).toBe('Strongly bearish');
    expect(interpretationLabel('bearish')).toBe('Bearish');
    expect(interpretationLabel('neutral')).toBe('Neutral');
    expect(interpretationLabel('bullish')).toBe('Bullish');
    expect(interpretationLabel('strongly_bullish')).toBe('Strongly bullish');
    expect(assetClassLabel('crypto')).toBe('Crypto');
    expect(assetClassLabel('equity')).toBe('Equity');
    expect(assetClassLabel('etf')).toBe('ETF');
    expect(marketTypeLabel('spot')).toBe('Spot');
    expect(paperRunStatusLabel('active')).toBe('Active run');
    expect(paperRunStatusLabel('stopped')).toBe('Stopped run');
  });

  it('provides a safe, non-empty fallback for future and empty values', () => {
    expect(decisionActionLabel('future_action')).toBe('Future action');
    expect(interpretationLabel('')).toBe('Unknown');
  });
});
