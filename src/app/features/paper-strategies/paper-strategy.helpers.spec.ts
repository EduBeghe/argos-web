import {
  actionWarning,
  deploymentActions,
  lifecycleLabel,
  strategyLabel,
} from './paper-strategy.helpers';
import { PaperDeployment } from './paper-strategy.models';

const deployment = (status: string, isPrimary = false): PaperDeployment => ({
  id: 'id',
  display_name: 'Strategy',
  strategy_kind: 'baseline',
  lifecycle: status,
  is_primary: isPrimary,
  current_cash: '10000',
  open_position_count: 0,
  current_run_id: null,
  created_at: '2026-01-01T00:00:00Z',
  paused_at: null,
  archived_at: null,
});

describe('Paper deployment lifecycle presentation', () => {
  it('exposes only lifecycle-valid actions', () => {
    expect(deploymentActions(deployment('active'))).toEqual(['pause', 'make-primary']);
    expect(deploymentActions(deployment('paused'))).toEqual(['resume', 'make-primary', 'archive']);
    expect(deploymentActions(deployment('paused', true))).toEqual(['resume']);
    expect(deploymentActions(deployment('archived'))).toEqual([]);
    expect(deploymentActions(deployment('future'))).toEqual([]);
  });
  it('keeps unknown vocabulary safe and warnings operationally exact', () => {
    expect(strategyLabel('future')).toBe('Unknown: future');
    expect(lifecycleLabel('future')).toBe('Unknown: future');
    expect(actionWarning('pause')).toContain('scheduled fixed-horizon exits');
    expect(actionWarning('archive')).toContain('performs no liquidation');
  });
});
