import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : [path];
    }),
  );
  return nested.flat();
}

test('authentication source contains no storage, cookie, bearer, or mojibake escape hatch', async () => {
  const files = [
    ...(await sourceFiles('src/app/core/auth')),
    ...(await sourceFiles('src/app/features/login')),
  ];
  const forbidden = [
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'document.cookie',
    'Authorization',
    'Ã¢',
    'Ãƒ',
    'Ã¯Â¿Â½',
    'ï¿½',
  ];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const marker of forbidden) {
      assert.equal(content.includes(marker), false, `${file} contains forbidden marker ${marker}`);
    }
  }
  const readme = await readFile('README.md', 'utf8');
  for (const marker of forbidden.slice(5)) {
    assert.equal(readme.includes(marker), false, `README.md contains mojibake marker ${marker}`);
  }
});
