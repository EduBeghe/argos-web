import { formatSignedPercentage } from '../../shared/formatting/decimal-format';
import { formatDuration as sharedFormatDuration } from '../ml-refinement/ml-refinement.helpers';
import {
  CampaignOutcome,
  CategoryCounts,
  FamilyCategory,
  FamilyFilters,
} from './ml-search-campaign.models';

export const CATEGORIES: ReadonlyArray<{
  id: FamilyCategory;
  label: string;
  definition: string;
}> = [
  {
    id: 'strong',
    label: 'Strong candidates',
    definition: 'Completed stage-four families that passed the strong development gate.',
  },
  {
    id: 'competing',
    label: 'Still competing',
    definition:
      'Families that passed their latest completed economic gate but are not final winners.',
  },
  {
    id: 'near',
    label: 'Near misses',
    definition: 'Discarded families that reached deep refinement at stage 4 or 3.',
  },
  {
    id: 'early',
    label: 'Early discarded',
    definition: 'Families discarded at stage 2 or stage 1.',
  },
  {
    id: 'pending',
    label: 'Pending / in progress',
    definition: 'Families waiting for work or attached to scheduled work.',
  },
];

export function categoryFilters(
  category: FamilyCategory,
  subcategory: number | 'pending' | 'scheduled',
): FamilyFilters {
  if (category === 'strong') return { state: 'strong_development_candidate' };
  if (category === 'competing') return { state: 'survived' };
  if (category === 'near') return { state: 'discarded', stage: Number(subcategory) || 4 };
  if (category === 'early') return { state: 'discarded', stage: Number(subcategory) || 2 };
  return { state: subcategory === 'pending' ? 'pending' : 'scheduled' };
}

export function composeCategoryCounts(
  values: Readonly<Record<string, number | null>>,
): CategoryCounts {
  const sum = (...keys: string[]) =>
    keys.some((key) => values[key] === null)
      ? null
      : keys.reduce((total, key) => total + (values[key] ?? 0), 0);
  return {
    strong: values['strong'] ?? null,
    competing: values['competing'] ?? null,
    near: sum('near4', 'near3'),
    early: sum('early2', 'early1'),
    pending: sum('scheduled', 'pending'),
  };
}

export function outcomePresentation(outcome: CampaignOutcome | string | null): {
  title: string;
  detail: string;
  tone: string;
} {
  if (outcome === 'strong_candidates_found')
    return {
      title: 'Strong development candidates found',
      detail: 'Review is authorized. Strategy activation and trading are not.',
      tone: 'positive',
    };
  if (outcome === 'no_strong_candidate')
    return {
      title: 'No strong development candidate',
      detail: 'The completed search did not produce a family that passed every scientific gate.',
      tone: 'neutral',
    };
  if (outcome === 'coverage_incomplete')
    return {
      title: 'Inconclusive: breadth coverage incomplete',
      detail:
        'Stage-one coverage did not finish, so the search cannot support a complete conclusion.',
      tone: 'warning',
    };
  if (outcome === 'search_budget_exhausted')
    return {
      title: 'Search ended after breadth coverage',
      detail:
        'Stage-one coverage completed, but the search ended before a strong final conclusion.',
      tone: 'warning',
    };
  return {
    title: 'Scientific outcome pending',
    detail: 'The campaign is still collecting bounded development evidence.',
    tone: 'active',
  };
}

export function humanize(value: string | null | undefined): string {
  if (!value) return 'Not available';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function abbreviate(value: string | null, length = 8): string {
  return value ? `${value.slice(0, length)}…` : 'Not available';
}

export function formatDuration(seconds: number): string {
  return sharedFormatDuration(seconds);
}

export function formatReturn(value: string | null | undefined): string {
  return value == null ? 'Not evaluated' : formatSignedPercentage(value);
}
