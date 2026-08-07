import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const styles = read('../src/app/shared/components/workspace-navigation/workspace-navigation.scss');

test('workspace navigation preserves the responsive interaction contract', () => {
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /gap:\s*0\.65rem/);
  assert.match(styles, /@media \(max-width:\s*50\.25rem\)/);
  assert.match(styles, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width:\s*22rem\)/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /max-width:\s*100%/);
});

test('all primary pages declare one explicit workspace identity', () => {
  const hosts = new Map([
    ['dashboard', '../src/app/features/dashboard/dashboard-page.html'],
    ['automated-search', '../src/app/features/ml-search-campaigns/ml-search-campaign-page.html'],
    ['ml-refinement', '../src/app/features/ml-refinement/ml-refinement-page.html'],
    ['strategy-research', '../src/app/features/strategy-research/strategy-research-page.html'],
    ['paper-strategies', '../src/app/features/paper-strategies/paper-strategies-page.html'],
  ]);

  for (const [identity, path] of hosts) {
    const template = read(path);
    assert.equal(
      template.match(/<app-workspace-navigation\b/g)?.length,
      1,
      `${identity} must render shared navigation exactly once`,
    );
    assert.match(template, new RegExp(`currentWorkspace="${identity}"`));
  }
});
