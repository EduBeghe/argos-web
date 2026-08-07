import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type WorkspaceIdentity =
  'dashboard' | 'automated-search' | 'ml-refinement' | 'strategy-research' | 'paper-strategies';

interface WorkspaceDestination {
  readonly identity: WorkspaceIdentity;
  readonly label: string;
  readonly route: string;
}

const WORKSPACES: readonly WorkspaceDestination[] = [
  { identity: 'dashboard', label: 'Dashboard', route: '/' },
  {
    identity: 'automated-search',
    label: 'Automated Search',
    route: '/ml-search-campaigns',
  },
  { identity: 'ml-refinement', label: 'ML Refinement', route: '/ml-refinement' },
  { identity: 'strategy-research', label: 'Strategy Research', route: '/strategies' },
  { identity: 'paper-strategies', label: 'Paper Strategies', route: '/paper-strategies' },
];

@Component({
  selector: 'app-workspace-navigation',
  imports: [RouterLink],
  templateUrl: './workspace-navigation.html',
  styleUrl: './workspace-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceNavigation {
  readonly currentWorkspace = input.required<WorkspaceIdentity>();

  protected readonly workspaces = WORKSPACES;
}
