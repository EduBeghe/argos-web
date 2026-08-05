import { DeploymentAction, PaperDeployment } from './paper-strategy.models';

export function humanizeCode(value: string): string {
  if (!value) return 'Not available';
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

export function strategyLabel(value: string): string {
  if (value === 'baseline') return 'Baseline';
  if (value === 'ml_fixed_horizon_long_only') return 'ML fixed-horizon strategy';
  return `Unknown: ${value}`;
}

export function lifecycleLabel(value: string): string {
  return ['active', 'paused', 'archived'].includes(value)
    ? humanizeCode(value)
    : `Unknown: ${value}`;
}

export function deploymentActions(item: PaperDeployment): DeploymentAction[] {
  if (item.lifecycle === 'active') {
    return item.is_primary ? ['pause'] : ['pause', 'make-primary'];
  }
  if (item.lifecycle === 'paused') {
    const actions: DeploymentAction[] = ['resume'];
    if (!item.is_primary) actions.push('make-primary', 'archive');
    return actions;
  }
  return [];
}

export function actionWarning(action: DeploymentAction): string {
  const messages: Record<DeploymentAction, string> = {
    pause:
      'Pause this deployment? No ML decisions, including scheduled fixed-horizon exits, occur while paused. Overdue exits execute only after resume.',
    resume: 'Resume this deployment? Decision generation resumes on the next scheduled cycle.',
    archive:
      'Archive this deployment permanently? This stops the current Paper run, preserves all historical evidence, performs no liquidation, and may leave historical open positions recorded.',
    'make-primary':
      'Make this deployment primary? This changes the primary designation but does not pause other active deployments.',
  };
  return messages[action];
}

export function formatCurrency(value: string | null | undefined): string {
  if (value === null || value === undefined || !value.trim()) return 'Not available';
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)} USDT`
    : 'Not available';
}
