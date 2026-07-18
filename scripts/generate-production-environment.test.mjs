import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  generateProductionEnvironment,
  normalizeApiBaseUrl,
} from './generate-production-environment.mjs';

async function generate(apiBaseUrl) {
  const directory = await mkdtemp(join(tmpdir(), 'argos-web-environment-'));
  const outputPath = join(directory, 'environment.production.ts');
  await generateProductionEnvironment({ apiBaseUrl, outputPath });
  return readFile(outputPath, 'utf8');
}

test('generates the expected environment for a valid API URL', async () => {
  assert.equal(
    await generate('https://api.example.test'),
    'export const environment = {\n  apiBaseUrl: "https://api.example.test",\n};\n',
  );
});

test('removes only the final slash', () => {
  assert.equal(
    normalizeApiBaseUrl('https://api.example.test/path/'),
    'https://api.example.test/path',
  );
});

test('rejects a missing value', () => {
  assert.throws(() => normalizeApiBaseUrl(undefined), /required/);
});

test('rejects a relative URL', () => {
  assert.throws(() => normalizeApiBaseUrl('/api'), /absolute/);
});

test('rejects credentials', () => {
  assert.throws(() => normalizeApiBaseUrl('https://user:secret@example.test'), /credentials/);
});

test('serializes special characters without TypeScript injection', async () => {
  const maliciousUrl = 'https://example.test/?value=\";globalThis.injected=true';
  const content = await generate(maliciousUrl);

  assert.ok(content.includes(JSON.stringify(maliciousUrl)));
  assert.equal(content.match(/globalThis\.injected/g)?.length, 1);
  assert.ok(!content.includes('apiBaseUrl: "https://example.test/?value=";'));
});
