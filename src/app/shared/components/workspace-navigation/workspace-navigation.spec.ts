import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';

import { WorkspaceIdentity, WorkspaceNavigation } from './workspace-navigation';

const CONTRACT = [
  { identity: 'dashboard', label: 'Dashboard', route: '/' },
  { identity: 'automated-search', label: 'Automated Search', route: '/ml-search-campaigns' },
  { identity: 'ml-refinement', label: 'ML Refinement', route: '/ml-refinement' },
  { identity: 'strategy-research', label: 'Strategy Research', route: '/strategies' },
  { identity: 'paper-strategies', label: 'Paper Strategies', route: '/paper-strategies' },
] as const satisfies readonly {
  identity: WorkspaceIdentity;
  label: string;
  route: string;
}[];

describe('WorkspaceNavigation', () => {
  let fixture: ComponentFixture<WorkspaceNavigation>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WorkspaceNavigation],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(WorkspaceNavigation);
  });

  it.each(CONTRACT)('renders the canonical destinations for $identity', ({ identity, route }) => {
    fixture.componentRef.setInput('currentWorkspace', identity);
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    const anchors = fixture.debugElement.queryAll(By.directive(RouterLink));
    const expected = CONTRACT.filter((workspace) => workspace.identity !== identity);

    expect(nav.getAttribute('aria-label')).toBe('Argos workspaces');
    expect(anchors).toHaveLength(4);
    expect(
      anchors.map((anchor) => ({
        label: anchor.nativeElement.textContent.trim(),
        route: anchor.injector.get(RouterLink).routerLink,
      })),
    ).toEqual(expected.map((workspace) => ({ label: workspace.label, route: workspace.route })));
    expect(
      anchors.filter((anchor) => anchor.injector.get(RouterLink).routerLink === route),
    ).toEqual([]);
    expect(anchors.every((anchor) => anchor.nativeElement.tabIndex === 0)).toBe(true);
  });

  it('keeps workspace identities closed at compile time', () => {
    // @ts-expect-error arbitrary strings are not valid workspace identities
    const invalid: WorkspaceIdentity = 'unknown-workspace';
    expect(invalid).toBe('unknown-workspace');
  });
});
