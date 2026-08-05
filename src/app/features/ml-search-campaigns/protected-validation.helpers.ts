import { FinalValidationResponse } from './ml-search-campaign.models';

export function currentValidationContract(item: FinalValidationResponse): boolean {
  return (
    item.frozen_inputs['simulation_version'] === 2 &&
    item.frozen_inputs['policy_version'] === 1 &&
    item.frozen_inputs['decision_cadence_seconds'] === 1800
  );
}

export function terminalWorkStatus(status: string): boolean {
  return !['queued', 'running'].includes(status);
}

export function validationPresentation(classification: string | null): string {
  const labels: Record<string, string> = {
    passed: 'Passed protected validation; eligible for paper deployment.',
    rejected: 'Rejected by protected policy.',
    invalid: 'Invalid evidence; not deployable.',
    passed_evidence_artifact_failed:
      'Evidence passed but artifact creation failed; not deployable.',
  };
  if (!classification) return 'Not available';
  return labels[classification] ?? `Unknown: ${classification}`;
}

export function validDisplayName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 80 && /^[\x20-\x7E]+$/.test(trimmed);
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not available';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return 'Available in details';
  return String(value);
}

export function reasonLabel(value: string): string {
  return (
    value
      .split('_')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' ') || 'Not available'
  );
}
