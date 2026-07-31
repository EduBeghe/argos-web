import {
  categoryFilters,
  composeCategoryCounts,
  formatReturn,
  humanize,
  outcomePresentation,
} from './ml-search-campaign.helpers';

describe('ML search campaign presentation helpers', () => {
  it('maps every category to the exact persisted state and selected stage', () => {
    expect(categoryFilters('strong', 4)).toEqual({ state: 'strong_development_candidate' });
    expect(categoryFilters('competing', 4)).toEqual({ state: 'survived' });
    expect(categoryFilters('near', 3)).toEqual({ state: 'discarded', stage: 3 });
    expect(categoryFilters('early', 1)).toEqual({ state: 'discarded', stage: 1 });
    expect(categoryFilters('pending', 'scheduled')).toEqual({ state: 'scheduled' });
    expect(categoryFilters('pending', 'pending')).toEqual({ state: 'pending' });
  });

  it('composes only non-overlapping totals and propagates unavailable constituents', () => {
    expect(
      composeCategoryCounts({
        strong: 2,
        competing: 3,
        near4: 5,
        near3: 7,
        early2: 11,
        early1: 13,
        scheduled: 17,
        pending: 19,
      }),
    ).toEqual({ strong: 2, competing: 3, near: 12, early: 24, pending: 36 });
    expect(
      composeCategoryCounts({
        strong: 0,
        competing: 0,
        near4: 0,
        near3: null,
        early2: 0,
        early1: 0,
        scheduled: 0,
        pending: 0,
      }).near,
    ).toBeNull();
  });

  it('presents scientific outcomes without implying activation or trading approval', () => {
    expect(outcomePresentation('strong_candidates_found').detail).toContain('not');
    expect(outcomePresentation('coverage_incomplete').title).toContain('Inconclusive');
    expect(outcomePresentation('search_budget_exhausted').detail).not.toContain('runtime');
    expect(outcomePresentation(null).title).toContain('pending');
  });

  it('preserves zero as evidence, formats signed Decimal returns and safely humanizes unknown values', () => {
    expect(formatReturn('0')).toContain('0.00%');
    expect(formatReturn('-0.001')).toContain('-0.10%');
    expect(formatReturn(null)).toBe('Not evaluated');
    expect(humanize('future_state_added')).toBe('Future State Added');
  });
});
