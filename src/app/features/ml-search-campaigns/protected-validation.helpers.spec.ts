import {
  currentValidationContract,
  reasonLabel,
  terminalWorkStatus,
  validDisplayName,
  validationPresentation,
} from './protected-validation.helpers';
import { FinalValidationResponse } from './ml-search-campaign.models';

const validation = (frozen: Record<string, unknown>): FinalValidationResponse => ({
  id: 'validation',
  campaign_id: 'campaign',
  family_id: 'family',
  status: 'completed',
  classification: 'passed',
  frozen_inputs: frozen,
  scenario_metrics: null,
  execution_manifest: null,
  failed_rules: [],
  protected_data_read_at: null,
  failure_code: null,
  failure_message: null,
  created_at: '2026-01-01T00:00:00Z',
  completed_at: null,
});

describe('protected validation presentation', () => {
  it('detects only the exact corrected contract without coercion', () => {
    expect(
      currentValidationContract(
        validation({ simulation_version: 2, policy_version: 1, decision_cadence_seconds: 1800 }),
      ),
    ).toBe(true);
    expect(
      currentValidationContract(
        validation({ simulation_version: '2', policy_version: 1, decision_cadence_seconds: 1800 }),
      ),
    ).toBe(false);
    expect(
      currentValidationContract(
        validation({ simulation_version: 2, policy_version: 1, decision_cadence_seconds: 300 }),
      ),
    ).toBe(false);
  });
  it('keeps terminal and unknown classifications explicit', () => {
    expect(terminalWorkStatus('running')).toBe(false);
    expect(terminalWorkStatus('rejected')).toBe(true);
    expect(validationPresentation('passed')).toContain('eligible for paper deployment');
    expect(validationPresentation('future_state')).toBe('Unknown: future_state');
  });
  it('validates trimmed printable display-name boundaries', () => {
    expect(validDisplayName('a')).toBe(true);
    expect(validDisplayName('a'.repeat(80))).toBe(true);
    expect(validDisplayName('   ')).toBe(false);
    expect(validDisplayName('a'.repeat(81))).toBe(false);
  });
  it('humanizes reason codes without discarding the source vocabulary', () => {
    expect(reasonLabel('incompatible_final_validation_contract')).toBe(
      'Incompatible Final Validation Contract',
    );
  });
});
